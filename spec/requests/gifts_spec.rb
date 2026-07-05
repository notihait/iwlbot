require_relative "../spec_helper"

RSpec.describe "Gifts API" do
  let(:user)     { User.create!(telegram_id: 111_222, first_name: "Тест") }
  let(:wishlist) { user.wishlists.create!(title: "День рождения") }

  let(:valid_pic) { "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAA=" }

  # POST

  describe "POST /api/gifts" do
    it "создаёт подарок с валидными данными" do
      post "/api/gifts",
           { wishlist_id: wishlist.id, name: "Книга", link: "https://example.com", price: "19.99" }.to_json,
           json_headers

      expect(last_response.status).to eq(201)
      expect(json_body["ok"]).to eq(true)
      expect(json_body["id"]).to be_a(Integer)
      expect(Gift.count).to eq(1)
    end

    it "создаёт подарок с картинкой в base64" do
      post "/api/gifts",
           { wishlist_id: wishlist.id, name: "Книга", pic: valid_pic }.to_json,
           json_headers

      expect(last_response.status).to eq(201)
      expect(Gift.last.pic).to eq(valid_pic)
    end

    it "создаёт подарок без необязательных полей" do
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
    end

    it "отклоняет пустую строку в name" do
      post "/api/gifts", { wishlist_id: wishlist.id, name: "   " }.to_json, json_headers

      expect(last_response.status).to eq(400)
    end

    it "отклоняет слишком длинное name" do
      post "/api/gifts", { wishlist_id: wishlist.id, name: "а" * 201 }.to_json, json_headers

      expect(last_response.status).to eq(400)
    end

    it "возвращает 404 при несуществующем wishlist_id" do
      post "/api/gifts", { wishlist_id: 999_999, name: "Книга" }.to_json, json_headers

      expect(last_response.status).to eq(404)
    end

    it "отклоняет текст вместо числа в price" do
      post "/api/gifts",
           { wishlist_id: wishlist.id, name: "Книга", price: "не число" }.to_json,
           json_headers

      expect(last_response.status).to eq(400)
    end

    it "принимает price с копейками" do
      post "/api/gifts",
           { wishlist_id: wishlist.id, name: "Книга", price: "1500.50" }.to_json,
           json_headers

      expect(last_response.status).to eq(201)
    end

    it "отклоняет price с более чем 2 знаками после точки" do
      post "/api/gifts",
           { wishlist_id: wishlist.id, name: "Книга", price: "1500.999" }.to_json,
           json_headers

      expect(last_response.status).to eq(400)
    end

    it "отклоняет pic, если это не data URL с картинкой" do
      post "/api/gifts",
           { wishlist_id: wishlist.id, name: "Книга", pic: "https://example.com/pic.jpg" }.to_json,
           json_headers

      expect(last_response.status).to eq(400)
    end

    it "отклоняет слишком большую картинку" do
      huge_pic = "data:image/jpeg;base64," + ("A" * 600_000)

      post "/api/gifts",
           { wishlist_id: wishlist.id, name: "Книга", pic: huge_pic }.to_json,
           json_headers

      expect(last_response.status).to eq(400)
    end
  end

  # GET

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

    it "показывает статус брони" do
      other_user = User.create!(telegram_id: 333_444, first_name: "Друг")
      gift = wishlist.gifts.create!(name: "Книга", reserved_by_id: other_user.id, reserved_at: Time.now)

      get "/api/gifts", wishlist_id: wishlist.id, viewer_id: other_user.id

      g = json_body.first
      expect(g["reserved"]).to eq(true)
      expect(g["reserved_by_me"]).to eq(true)
    end

    it "reserved_by_me false для чужой брони" do
      other_user = User.create!(telegram_id: 333_444, first_name: "Друг")
      third_user = User.create!(telegram_id: 555_666, first_name: "Третий")
      wishlist.gifts.create!(name: "Книга", reserved_by_id: other_user.id, reserved_at: Time.now)

      get "/api/gifts", wishlist_id: wishlist.id, viewer_id: third_user.id

      g = json_body.first
      expect(g["reserved"]).to eq(true)
      expect(g["reserved_by_me"]).to eq(false)
    end
  end

  # RESERVE

  describe "POST /api/gifts/:id/reserve" do
    let(:other_user) { User.create!(telegram_id: 333_444, first_name: "Друг") }

    it "бронирует подарок" do
      gift = wishlist.gifts.create!(name: "Книга")

      post "/api/gifts/#{gift.id}/reserve", { user_id: other_user.id }.to_json, json_headers

      expect(last_response.status).to eq(200)
      expect(gift.reload.reserved_by_id).to eq(other_user.id)
    end

    it "не даёт забронировать уже забронированный подарок другим юзером" do
      gift = wishlist.gifts.create!(name: "Книга", reserved_by_id: other_user.id, reserved_at: Time.now)
      third_user = User.create!(telegram_id: 555_666, first_name: "Третий")

      post "/api/gifts/#{gift.id}/reserve", { user_id: third_user.id }.to_json, json_headers

      expect(last_response.status).to eq(409)
    end

    it "повторная бронь тем же юзером не ошибка" do
      gift = wishlist.gifts.create!(name: "Книга", reserved_by_id: other_user.id, reserved_at: Time.now)

      post "/api/gifts/#{gift.id}/reserve", { user_id: other_user.id }.to_json, json_headers

      expect(last_response.status).to eq(200)
    end

    it "404 для несуществующего подарка" do
      post "/api/gifts/999999/reserve", { user_id: other_user.id }.to_json, json_headers

      expect(last_response.status).to eq(404)
    end

    it "отклоняет запрос без user_id" do
      gift = wishlist.gifts.create!(name: "Книга")

      post "/api/gifts/#{gift.id}/reserve", {}.to_json, json_headers

      expect(last_response.status).to eq(400)
    end
  end

  describe "DELETE /api/gifts/:id/reserve" do
    let(:other_user) { User.create!(telegram_id: 333_444, first_name: "Друг") }

    it "снимает свою бронь" do
      gift = wishlist.gifts.create!(name: "Книга", reserved_by_id: other_user.id, reserved_at: Time.now)

      delete "/api/gifts/#{gift.id}/reserve", { user_id: other_user.id }.to_json, json_headers

      expect(last_response.status).to eq(200)
      expect(gift.reload.reserved_by_id).to be_nil
    end

    it "не даёт снять чужую бронь" do
      gift = wishlist.gifts.create!(name: "Книга", reserved_by_id: other_user.id, reserved_at: Time.now)
      third_user = User.create!(telegram_id: 555_666, first_name: "Третий")

      delete "/api/gifts/#{gift.id}/reserve", { user_id: third_user.id }.to_json, json_headers

      expect(last_response.status).to eq(403)
      expect(gift.reload.reserved_by_id).to eq(other_user.id)
    end

    it "404 для несуществующего подарка" do
      delete "/api/gifts/999999/reserve", { user_id: other_user.id }.to_json, json_headers

      expect(last_response.status).to eq(404)
    end
  end

  describe "PUT /api/gifts/:id" do
    it "обновляет название, ссылку и цену" do
      gift = wishlist.gifts.create!(name: "Старое", price: 100)

      put "/api/gifts/#{gift.id}",
          { name: "Новое", link: "https://example.com", price: "250.50" }.to_json,
          json_headers

      expect(last_response.status).to eq(200)
      gift.reload
      expect(gift.name).to eq("Новое")
      expect(gift.link).to eq("https://example.com")
      expect(gift.price.to_s).to eq("250.5")
    end

    it "позволяет очистить цену и ссылку" do
      gift = wishlist.gifts.create!(name: "Подарок", price: 100, link: "https://example.com")

      put "/api/gifts/#{gift.id}", { name: "Подарок", price: nil, link: nil }.to_json, json_headers

      expect(last_response.status).to eq(200)
      gift.reload
      expect(gift.price).to be_nil
      expect(gift.link).to be_nil
    end

    it "сохраняет старую картинку, если pic не передан" do
      gift = wishlist.gifts.create!(name: "Подарок", pic: valid_pic)

      put "/api/gifts/#{gift.id}", { name: "Подарок обновлён" }.to_json, json_headers

      expect(last_response.status).to eq(200)
      expect(gift.reload.pic).to eq(valid_pic)
    end

    it "отклоняет пустое название" do
      gift = wishlist.gifts.create!(name: "Подарок")

      put "/api/gifts/#{gift.id}", { name: "  " }.to_json, json_headers

      expect(last_response.status).to eq(400)
    end

    it "404 для несуществующего подарка" do
      put "/api/gifts/999999", { name: "Подарок" }.to_json, json_headers

      expect(last_response.status).to eq(404)
    end
  end
  
  # DELETE

  describe "DELETE /api/gifts/:id" do
    it "удаляет подарок" do
      gift = wishlist.gifts.create!(name: "Удали меня")

      delete "/api/gifts/#{gift.id}"

      expect(last_response.status).to eq(200)
      expect(json_body["ok"]).to eq(true)
      expect(Gift.exists?(gift.id)).to eq(false)
    end

    it "возвращает 404 при удалении несуществующего подарка" do
      delete "/api/gifts/999999"

      expect(last_response.status).to eq(404)
    end
  end
end