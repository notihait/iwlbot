require "sinatra/base"
require "json"
require_relative "../helpers/auth_helper"
require_relative "../lib/santa_notifier"

class SantaController < Sinatra::Base
  set :host_authorization, {}
  disable :protection
  helpers AuthHelper

  MAX_TITLE_LENGTH = 100
  CURRENCIES = %w[RUB USD EUR UAH KZT BYN].freeze

  before do
    content_type :json
  end

  helpers do
    def json_body
      JSON.parse(request.body.read)
    rescue JSON::ParserError
      {}
    end

    def find_participant!(event_id, user_id)
      SantaParticipant.find_by(santa_event_id: event_id, user_id: user_id) ||
        halt(403, { ok: false, error: "forbidden" }.to_json)
    end
  end

  # CREATE EVENT

  post "/api/santa" do
    user_id = current_user_id!
    payload = json_body

    title = payload["title"].to_s.strip
    halt 400, { ok: false, error: "title required" }.to_json if title.empty?
    halt 400, { ok: false, error: "title too long" }.to_json if title.length > MAX_TITLE_LENGTH

    raw_date = payload["exchange_date"].to_s.strip
    date = nil
    unless raw_date.empty?
      date = begin
        Date.iso8601(raw_date)
      rescue ArgumentError
        halt 400, { ok: false, error: "exchange_date must be YYYY-MM-DD" }.to_json
      end
    end

    budget = payload["budget"]
    if budget && !budget.to_s.strip.empty?
      halt 400, { ok: false, error: "budget must be a positive integer" }.to_json unless budget.to_s.match?(/\A\d+\z/)
    end

    currency = (payload["currency"] || "RUB").to_s.upcase
    halt 400, { ok: false, error: "invalid currency" }.to_json unless CURRENCIES.include?(currency)

    event = SantaEvent.create!(
      owner_id: user_id,
      title: title,
      budget: budget.to_s.empty? ? nil : budget.to_i,
      currency: currency,
      exchange_date: date
    )
    event.santa_participants.create!(user_id: user_id)

    status 201
    { ok: true, id: event.id, invite_code: event.invite_code }.to_json
  end

  # JOIN BY INVITE CODE (повторное вступление безопасно: вернёт ok и id)

  post "/api/santa/join/:code" do
    user_id = current_user_id!
    payload = json_body

    event = SantaEvent.find_by(invite_code: params[:code])
    halt 404, { ok: false, error: "event not found" }.to_json unless event

    existing = SantaParticipant.find_by(santa_event_id: event.id, user_id: user_id)
    halt 409, { ok: false, error: "already drawn" }.to_json if !event.open? && !existing

    wishlist_id = payload["wishlist_id"]
    if wishlist_id && !wishlist_id.to_s.empty?
      wishlist = Wishlist.active.find_by(id: wishlist_id, user_id: user_id)
      halt 404, { ok: false, error: "wishlist not found" }.to_json unless wishlist
    end

    participant = existing || event.santa_participants.create!(user_id: user_id)
    participant.update!(wishlist_id: wishlist.id) if wishlist

    { ok: true, id: event.id }.to_json
  end

  # LEAVE EVENT (только до жеребьёвки, не для создателя)

  post "/api/santa/:id/leave" do
    user_id = current_user_id!

    event = SantaEvent.find_by(id: params[:id])
    halt 404, { ok: false, error: "event not found" }.to_json unless event
    halt 403, { ok: false, error: "owner cannot leave" }.to_json if event.owner_id.to_s == user_id.to_s

    participant = SantaParticipant.find_by(santa_event_id: event.id, user_id: user_id)
    halt 404, { ok: false, error: "not a participant" }.to_json unless participant
    halt 409, { ok: false, error: "already drawn" }.to_json unless event.open?

    participant.destroy
    { ok: true }.to_json
  end

  # DELETE EVENT (только создатель)

  delete "/api/santa/:id" do
    user_id = current_user_id!

    event = SantaEvent.find_by(id: params[:id])
    halt 404, { ok: false, error: "event not found" }.to_json unless event
    halt 403, { ok: false, error: "forbidden" }.to_json unless event.owner_id.to_s == user_id.to_s

    SantaEvent.transaction do
      SantaAssignment.where(santa_event_id: event.id).delete_all
      SantaParticipant.where(santa_event_id: event.id).delete_all
      event.destroy
    end

    { ok: true }.to_json
  end

  # CHOOSE WISHLIST FOR THE GAME

  put "/api/santa/:id/wishlist" do
    user_id = current_user_id!
    participant = find_participant!(params[:id], user_id)

    wishlist = Wishlist.active.find_by(id: json_body["wishlist_id"], user_id: user_id)
    halt 404, { ok: false, error: "wishlist not found" }.to_json unless wishlist

    participant.update!(wishlist_id: wishlist.id)
    { ok: true }.to_json
  end

  # MY EVENTS

  get "/api/santa/mine" do
    user_id = current_user_id!

    events = SantaEvent.joins(:santa_participants)
                       .where(santa_participants: { user_id: user_id })
                       .order(:exchange_date)

    events.map do |e|
      target = e.status == "drawn" ? e.santa_assignments.find_by(giver_id: user_id)&.receiver : nil
      {
        id: e.id,
        title: e.title,
        exchange_date: e.exchange_date,
        budget: e.budget,
        currency: e.currency,
        status: e.status,
        is_owner: e.owner_id.to_s == user_id.to_s,
        target_name: target&.first_name
      }
    end.to_json
  end

  # EVENT DETAILS

  get "/api/santa/:id" do
    user_id = current_user_id!
    me = find_participant!(params[:id], user_id)

    event = SantaEvent.find(params[:id])
    participants = event.santa_participants.includes(:user).map do |p|
      { user_id: p.user_id, first_name: p.user.first_name }
    end

    {
      id: event.id,
      title: event.title,
      budget: event.budget,
      currency: event.currency,
      exchange_date: event.exchange_date,
      status: event.status,
      invite_code: event.invite_code,
      is_owner: event.owner_id.to_s == user_id.to_s,
      my_wishlist_id: me.wishlist_id,
      participants: participants
    }.to_json
  end

  # DRAW (только организатор)

  post "/api/santa/:id/draw" do
    user_id = current_user_id!

    event = SantaEvent.find_by(id: params[:id])
    halt 404, { ok: false, error: "event not found" }.to_json unless event
    halt 403, { ok: false, error: "forbidden" }.to_json unless event.owner_id.to_s == user_id.to_s

    done = false
    too_few = false

    event.with_lock do
      if event.open?
        if event.santa_participants.count < 3
          too_few = true
        else
          event.draw!
          done = true
        end
      end
    end

    halt 422, { ok: false, error: "need at least 3 participants" }.to_json if too_few
    halt 409, { ok: false, error: "already drawn" }.to_json unless done

    # уведомления в Telegram, в фоне, чтобы не задерживать ответ
    Thread.new do
      begin
        SantaNotifier.drawn(event.reload)
      rescue => e
        warn "[santa] notify failed: #{e.class}: #{e.message}"
      end
    end

    { ok: true }.to_json
  end

  # MY TARGET

  get "/api/santa/:id/my-target" do
    user_id = current_user_id!

    assignment = SantaAssignment.find_by(santa_event_id: params[:id], giver_id: user_id)
    halt 404, { ok: false, error: "not drawn yet" }.to_json unless assignment

    receiver = assignment.receiver
    receiver_participant = SantaParticipant.find_by(
      santa_event_id: params[:id], user_id: receiver.id
    )
    wishlist = Wishlist.active.find_by(id: receiver_participant&.wishlist_id)

    {
      receiver: { id: receiver.id, first_name: receiver.first_name },
      wishlist_id: wishlist&.id
    }.to_json
  end
end