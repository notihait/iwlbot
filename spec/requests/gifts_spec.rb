require_relative "../spec_helper"

RSpec.describe "Gifts API" do
  let(:user)     { User.create!(telegram_id: 111_222, first_name: "Тест") }
  let(:wishlist) { user.wishlists.create!(title: "День рождения") }

  # =========================
  # POST /api/gifts
  # =========================
  describe "POST /api/gifts" do
    it "создаёт подарок с валидными данными" do
      post "/api/gifts",
           { wishlist_id: wishlist.id, name: "Книга", link: "https://example.com", price: 19.99 }.to_json,
           json_headers

      expect(last_response.status).to eq(201)
      expect(json_body["ok"]).to eq(true)
      expect(json_body["id"]).to be_a(Integer)
      expect(Gift.count).to eq(1)
    end

    it "создаёт подарок без необязательных полей (link, pic, price)" do
      post "/api/gifts",
           { wishlist_id: wishlist.id, name: "Просто подарок" }.to_json,
           json_headers

      expect(last_response.status).to eq(201)
      expect(Gift.last.name).to eq("Просто подарок")
    end

    it "отклоняет запрос без wishlist_id" do
      post "/api/gifts", { name: "Книга" }.to_json, json_headers

      expect(last_response.status).to eq(400)
      expect(json_body["ok"]).to eq(false)
    end

    it "отклоняет запрос без name" do
      post "/api/gifts", { wishlist_id: wishlist.id }.to_json, json_headers

      expect(last_response.status).to eq(400)
      expect(json_body["ok"]).to eq(false)
    end

    it "отклоняет пустую строку в name" do
      post "/api/gifts", { wishlist_id: wishlist.id, name: "   " }.to_json, json_headers

      expect(last_response.status).to eq(400)
    end

    it "падает при несуществующем wishlist_id" do
      # ЭТОТ ТЕСТ ФИКСИРУЕТ ТЕКУЩИЙ БАГ:
      # Wishlist.find кидает RecordNotFound без rescue → Sinatra отдаёт 500
      # После того как замените на Wishlist.find_by + halt 404,
      # поменяйте ожидание ниже на eq(404)
      post "/api/gifts", { wishlist_id: 999_999, name: "Книга" }.to_json, json_headers

      expect(last_response.status).to eq(500)
    end

    it "принимает текст вместо числа в price (текущее поведение, требует валидации)" do
      # Пока в контроллере нет проверки price — этот тест документирует дыру.
      # После добавления валидации ожидание нужно поменять на 400.
      post "/api/gifts",
           { wishlist_id: wishlist.id, name: "Книга", price: "не число" }.to_json,
           json_headers

      expect(last_response.status).to eq(201)
    end
  end

  # =========================
  # GET /api/gifts
  # =========================
  describe "GET /api/gifts" do
    it "возвращает список подарков вишлиста" do
      wishlist.gifts.create!(name: "Подарок 1")
      wishlist.gifts.create!(name: "Подарок 2")

      get "/api/gifts", wishlist_id: wishlist.id

      expect(last_response.status).to eq(200)
      expect(json_body.size).to eq(2)
    end

    it "возвращает пустой массив, если подарков нет" do
      get "/api/gifts", wishlist_id: wishlist.id

      expect(last_response.status).to eq(200)
      expect(json_body).to eq([])
    end

    it "не показывает чужие подарки" do
      other_wishlist = user.wishlists.create!(title: "Другой список")
      wishlist.gifts.create!(name: "Мой подарок")
      other_wishlist.gifts.create!(name: "Чужой подарок")

      get "/api/gifts", wishlist_id: wishlist.id

      names = json_body.map { |g| g["name"] }
      expect(names).to eq(["Мой подарок"])
    end

    it "отклоняет запрос без wishlist_id" do
      get "/api/gifts"

      expect(last_response.status).to eq(400)
    end
  end

  # =========================
  # DELETE /api/gifts/:id
  # =========================
  describe "DELETE /api/gifts/:id" do
    it "удаляет подарок" do
      gift = wishlist.gifts.create!(name: "Удали меня")

      delete "/api/gifts/#{gift.id}"

      expect(last_response.status).to eq(200)
      expect(json_body["ok"]).to eq(true)
      expect(Gift.exists?(gift.id)).to eq(false)
    end

    it "падает при удалении несуществующего подарка" do
      # Тот же баг: Gift.find без rescue → 500 вместо 404
      delete "/api/gifts/999999"

      expect(last_response.status).to eq(500)
    end
  end
end