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