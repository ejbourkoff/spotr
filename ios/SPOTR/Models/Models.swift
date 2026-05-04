import Foundation

// MARK: - User

struct User: Codable, Identifiable {
    let id: String
    let email: String
    let role: String
    let avatarUrl: String?
    let athleteProfile: AthleteProfile?
    let coachProfile: CoachProfile?
    let brandProfile: BrandProfile?

    var displayName: String {
        athleteProfile?.name ?? coachProfile?.name ?? brandProfile?.name ?? email
    }
    var sport: String? { athleteProfile?.sport }
}

struct AthleteProfile: Codable {
    let id: String
    let name: String
    let sport: String
    let position: String?
    let schoolTeam: String?
    let classYear: String?
    let location: String?
    let bio: String?
    let openToNIL: Bool?
    let slug: String?
}

struct CoachProfile: Codable {
    let id: String
    let name: String
    let organization: String?
    let title: String?
    let school: String?
}

struct BrandProfile: Codable {
    let id: String
    let name: String
    let organizationType: String?
}

// MARK: - Post

struct Post: Codable, Identifiable {
    let id: String
    let text: String
    let mediaUrl: String?
    let mediaType: String?
    let isReel: Bool
    let isStory: Bool
    let isHighlight: Bool
    let muxPlaybackId: String?
    let thumbnailUrl: String?
    let createdAt: String
    let author: PostAuthor
    var isLiked: Bool
    var isSaved: Bool
    let _count: PostCount
    var comments: [Comment]?

    var muxStreamUrl: URL? {
        guard let id = muxPlaybackId else { return nil }
        return URL(string: "https://stream.mux.com/\(id).m3u8")
    }
    var muxThumbnailUrl: URL? {
        guard let id = muxPlaybackId else { return nil }
        return URL(string: "https://image.mux.com/\(id)/thumbnail.jpg")
    }
}

struct PostAuthor: Codable {
    let id: String
    let role: String
    let avatarUrl: String?
    let athleteProfile: AuthorProfile?
    let coachProfile: CoachAuthorProfile?
    let brandProfile: BrandAuthorProfile?

    var displayName: String {
        athleteProfile?.name ?? coachProfile?.name ?? brandProfile?.name ?? "User"
    }
    var subtitle: String? {
        athleteProfile?.sport ?? coachProfile?.organization ?? brandProfile?.organizationType
    }
}

struct AuthorProfile: Codable {
    let id: String
    let name: String
    let sport: String
}

struct CoachAuthorProfile: Codable {
    let id: String
    let name: String
    let organization: String?
}

struct BrandAuthorProfile: Codable {
    let id: String
    let name: String
    let organizationType: String?
}

struct PostCount: Codable {
    let likes: Int
    let comments: Int
    let saves: Int
}

// MARK: - Comment

struct Comment: Codable, Identifiable {
    let id: String
    let text: String
    let createdAt: String
    let user: CommentUser
}

struct CommentUser: Codable {
    let athleteProfile: NameOnly?
    let coachProfile: NameOnly?
    let brandProfile: NameOnly?

    var displayName: String {
        athleteProfile?.name ?? coachProfile?.name ?? brandProfile?.name ?? "User"
    }
}

struct NameOnly: Codable {
    let name: String
}

// MARK: - Follow / User Search

struct SearchUser: Codable, Identifiable {
    let id: String
    let email: String
    let role: String
    let avatarUrl: String?
    let athleteProfile: AuthorProfile?
    let coachProfile: CoachAuthorProfile?
    let brandProfile: BrandAuthorProfile?
    let connected: Bool?
    let iFollow: Bool?
    let theyFollow: Bool?

    var displayName: String {
        athleteProfile?.name ?? coachProfile?.name ?? brandProfile?.name ?? email
    }
}

// MARK: - Message

struct Message: Codable, Identifiable {
    let id: String
    let senderId: String
    let receiverId: String
    let subject: String
    let body: String
    let readAt: String?
    let createdAt: String
    let sender: MessageUser?
    let receiver: MessageUser?
}

struct MessageUser: Codable {
    let id: String
    let avatarUrl: String?
    let athleteProfile: AuthorProfile?
    let coachProfile: CoachAuthorProfile?
    let brandProfile: BrandAuthorProfile?

    var displayName: String {
        athleteProfile?.name ?? coachProfile?.name ?? brandProfile?.name ?? "User"
    }
}

// MARK: - Offer / Deal

struct Offer: Codable, Identifiable {
    let id: String
    let deliverables: String
    let compensationAmount: Double
    let campaignStartDate: String
    let campaignEndDate: String
    let notes: String?
    let status: String
    let createdAt: String
    let brand: BrandOfferInfo?
    let deal: DealInfo?
}

struct BrandOfferInfo: Codable {
    let id: String
    let name: String
}

struct DealInfo: Codable, Identifiable {
    let id: String
    let status: String
}

// MARK: - API Responses

struct AuthResponse: Codable {
    let token: String
    let user: User
}

struct PostsResponse: Codable {
    let posts: [Post]
}

struct PostResponse: Codable {
    let post: Post
}

struct CommentsResponse: Codable {
    let comments: [Comment]
}

struct MessagesResponse: Codable {
    let messages: [Message]
}

struct OffersResponse: Codable {
    let offers: [Offer]
}

struct FollowersResponse: Codable {
    let followers: [SearchUser]
    let following: [SearchUser]
}

struct SearchResponse: Codable {
    let users: [SearchUser]
}

struct AthletesResponse: Codable {
    let athletes: [SearchUser]
}
