import Foundation

enum APIError: LocalizedError {
    case invalidURL
    case noToken
    case serverError(String)
    case decodingError(Error)
    case networkError(Error)

    var errorDescription: String? {
        switch self {
        case .invalidURL: return "Invalid URL"
        case .noToken: return "Not authenticated"
        case .serverError(let msg): return msg
        case .decodingError(let e): return "Decode error: \(e.localizedDescription)"
        case .networkError(let e): return e.localizedDescription
        }
    }
}

final class APIService {
    static let shared = APIService()
    private let base = "https://spotr-production.up.railway.app/api"

    private init() {}

    // MARK: - Core request

    func request<T: Decodable>(
        path: String,
        method: String = "GET",
        body: [String: Any]? = nil,
        token: String? = nil
    ) async throws -> T {
        guard let url = URL(string: base + path) else { throw APIError.invalidURL }
        var req = URLRequest(url: url)
        req.httpMethod = method
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token { req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        if let body { req.httpBody = try? JSONSerialization.data(withJSONObject: body) }

        do {
            let (data, response) = try await URLSession.shared.data(for: req)
            if let http = response as? HTTPURLResponse, !(200...299).contains(http.statusCode) {
                let msg = (try? JSONDecoder().decode([String: String].self, from: data))?["error"] ?? "Server error \(http.statusCode)"
                throw APIError.serverError(msg)
            }
            do {
                return try JSONDecoder().decode(T.self, from: data)
            } catch {
                throw APIError.decodingError(error)
            }
        } catch let error as APIError {
            throw error
        } catch {
            throw APIError.networkError(error)
        }
    }

    // MARK: - Auth

    func login(email: String, password: String) async throws -> AuthResponse {
        try await request(path: "/auth/login", method: "POST", body: ["email": email, "password": password])
    }

    func signup(email: String, password: String, role: String) async throws -> AuthResponse {
        try await request(path: "/auth/signup", method: "POST", body: ["email": email, "password": password, "role": role])
    }

    // MARK: - Feed

    func fetchFeed(token: String, limit: Int = 20, offset: Int = 0) async throws -> [Post] {
        let r: PostsResponse = try await request(path: "/posts/feed?limit=\(limit)&offset=\(offset)", token: token)
        return r.posts
    }

    func fetchStories(token: String) async throws -> [Post] {
        let r: PostsResponse = try await request(path: "/posts/stories", token: token)
        return r.posts
    }

    func fetchReels(token: String, limit: Int = 20, offset: Int = 0) async throws -> [Post] {
        let r: PostsResponse = try await request(path: "/posts/reels?limit=\(limit)&offset=\(offset)", token: token)
        return r.posts
    }

    func fetchPost(id: String, token: String) async throws -> Post {
        let r: PostResponse = try await request(path: "/posts/\(id)", token: token)
        return r.post
    }

    func fetchComments(postId: String, token: String) async throws -> [Comment] {
        let r: CommentsResponse = try await request(path: "/posts/\(postId)/comments", token: token)
        return r.comments
    }

    func addComment(postId: String, text: String, token: String) async throws -> Comment {
        struct Resp: Decodable { let comment: Comment }
        let r: Resp = try await request(path: "/posts/\(postId)/comments", method: "POST", body: ["text": text], token: token)
        return r.comment
    }

    func likePost(postId: String, token: String) async throws {
        struct Resp: Decodable { let liked: Bool? }
        let _: Resp = try await request(path: "/posts/\(postId)/like", method: "POST", token: token)
    }

    func unlikePost(postId: String, token: String) async throws {
        struct Resp: Decodable { let liked: Bool? }
        let _: Resp = try await request(path: "/posts/\(postId)/like", method: "DELETE", token: token)
    }

    func deletePost(id: String, token: String) async throws {
        struct Resp: Decodable { let success: Bool? }
        let _: Resp = try await request(path: "/posts/\(id)", method: "DELETE", token: token)
    }

    // MARK: - Create post

    func createPost(text: String, mediaUrl: String?, mediaType: String?, isReel: Bool = false, isStory: Bool = false, token: String) async throws -> Post {
        var body: [String: Any] = ["text": text, "isReel": isReel, "isStory": isStory]
        if let url = mediaUrl { body["mediaUrl"] = url }
        if let type = mediaType { body["mediaType"] = type }
        let r: PostResponse = try await request(path: "/posts", method: "POST", body: body, token: token)
        return r.post
    }

    // MARK: - Profile

    func fetchUserProfile(userId: String, token: String) async throws -> User {
        struct Resp: Decodable { let user: User }
        let r: Resp = try await request(path: "/athletes/\(userId)/profile", token: token)
        return r.user
    }

    func fetchUserPosts(userId: String, token: String) async throws -> [Post] {
        let r: PostsResponse = try await request(path: "/posts/user/\(userId)", token: token)
        return r.posts
    }

    func fetchMyPosts(token: String) async throws -> [Post] {
        let r: PostsResponse = try await request(path: "/posts/my", token: token)
        return r.posts
    }

    // MARK: - Follow

    func follow(userId: String, token: String) async throws {
        struct Resp: Decodable { let following: Bool? }
        let _: Resp = try await request(path: "/users/\(userId)/follow", method: "POST", token: token)
    }

    func unfollow(userId: String, token: String) async throws {
        struct Resp: Decodable { let following: Bool? }
        let _: Resp = try await request(path: "/users/\(userId)/follow", method: "DELETE", token: token)
    }

    // MARK: - Messages

    func fetchMessages(token: String) async throws -> [Message] {
        let r: MessagesResponse = try await request(path: "/messages", token: token)
        return r.messages
    }

    func sendMessage(receiverId: String, subject: String, body: String, token: String) async throws -> Message {
        struct Resp: Decodable { let message: Message }
        let r: Resp = try await request(path: "/messages", method: "POST", body: ["receiverId": receiverId, "subject": subject, "body": body], token: token)
        return r.message
    }

    // MARK: - Discover / Athletes

    func searchUsers(query: String, token: String) async throws -> [SearchUser] {
        let encoded = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? query
        let r: SearchResponse = try await request(path: "/users/search?q=\(encoded)", token: token)
        return r.users
    }

    func fetchAthletes(sport: String? = nil, token: String) async throws -> [SearchUser] {
        var path = "/athletes"
        if let sport { path += "?sport=\(sport)" }
        let r: AthletesResponse = try await request(path: path, token: token)
        return r.athletes
    }

    // MARK: - Offers

    func fetchOffers(token: String) async throws -> [Offer] {
        let r: OffersResponse = try await request(path: "/offers", token: token)
        return r.offers
    }

    func acceptOffer(id: String, token: String) async throws {
        struct Resp: Decodable { let offer: Offer? }
        let _: Resp = try await request(path: "/offers/\(id)/accept", method: "PUT", token: token)
    }

    func declineOffer(id: String, token: String) async throws {
        struct Resp: Decodable { let offer: Offer? }
        let _: Resp = try await request(path: "/offers/\(id)/decline", method: "PUT", token: token)
    }

    // MARK: - Upload

    func uploadImage(data: Data, token: String) async throws -> String {
        guard let url = URL(string: base + "/upload") else { throw APIError.invalidURL }
        let boundary = UUID().uuidString
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

        var body = Data()
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"file\"; filename=\"photo.jpg\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: image/jpeg\r\n\r\n".data(using: .utf8)!)
        body.append(data)
        body.append("\r\n--\(boundary)--\r\n".data(using: .utf8)!)
        req.httpBody = body

        let (respData, _) = try await URLSession.shared.data(for: req)
        struct Resp: Decodable { let url: String }
        let r = try JSONDecoder().decode(Resp.self, from: respData)
        return r.url
    }
}
