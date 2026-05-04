import SwiftUI
import AVKit

struct PostCard: View {
    let post: Post
    let token: String
    var onDelete: (() -> Void)? = nil
    var onTap: (() -> Void)? = nil

    @State private var isLiked: Bool
    @State private var likeCount: Int

    init(post: Post, token: String, onDelete: (() -> Void)? = nil, onTap: (() -> Void)? = nil) {
        self.post = post
        self.token = token
        self.onDelete = onDelete
        self.onTap = onTap
        self._isLiked = State(initialValue: post.isLiked)
        self._likeCount = State(initialValue: post._count.likes)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header
            HStack(spacing: 10) {
                AvatarView(url: post.author.avatarUrl, name: post.author.displayName, size: 38)

                VStack(alignment: .leading, spacing: 1) {
                    Text(post.author.displayName)
                        .font(.spotrHeadline)
                        .foregroundColor(.white)
                    if let sub = post.author.subtitle {
                        Text(sub)
                            .font(.spotrCaption)
                            .foregroundColor(.spotrMuted)
                    }
                }
                Spacer()
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 12)

            // Media
            if let mediaUrl = post.mediaUrl, let url = URL(string: mediaUrl) {
                if post.isReel || post.mediaType == "video" {
                    VideoThumbnailView(post: post, url: url)
                        .frame(maxWidth: .infinity)
                        .frame(height: 260)
                        .clipped()
                } else {
                    AsyncImage(url: url) { img in
                        img.resizable().scaledToFill()
                    } placeholder: {
                        Color.spotrCard
                            .overlay(ProgressView().tint(.spotrGreen))
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 260)
                    .clipped()
                    .onTapGesture { onTap?() }
                }
            }

            // Text
            if !post.text.isEmpty {
                Text(post.text)
                    .font(.spotrBody)
                    .foregroundColor(.white)
                    .padding(.horizontal, 14)
                    .padding(.top, 10)
                    .onTapGesture { onTap?() }
            }

            // Actions
            HStack(spacing: 20) {
                Button(action: toggleLike) {
                    HStack(spacing: 5) {
                        Image(systemName: isLiked ? "heart.fill" : "heart")
                            .foregroundColor(isLiked ? .red : .spotrMuted)
                            .font(.system(size: 20))
                        Text("\(likeCount)")
                            .font(.spotrCaption)
                            .foregroundColor(.spotrMuted)
                    }
                }

                Button(action: { onTap?() }) {
                    HStack(spacing: 5) {
                        Image(systemName: "bubble.left")
                            .foregroundColor(.spotrMuted)
                            .font(.system(size: 20))
                        Text("\(post._count.comments)")
                            .font(.spotrCaption)
                            .foregroundColor(.spotrMuted)
                    }
                }

                Spacer()

                Text(post.createdAt.relativeDate)
                    .font(.spotrCaption)
                    .foregroundColor(.spotrMuted)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 10)

            Divider()
                .background(Color.spotrBorder)
        }
        .background(Color.spotrBlack)
    }

    private func toggleLike() {
        let wasLiked = isLiked
        isLiked.toggle()
        likeCount += isLiked ? 1 : -1
        Task {
            do {
                if wasLiked {
                    try await APIService.shared.unlikePost(postId: post.id, token: token)
                } else {
                    try await APIService.shared.likePost(postId: post.id, token: token)
                }
            } catch {
                await MainActor.run {
                    isLiked = wasLiked
                    likeCount += wasLiked ? 1 : -1
                }
            }
        }
    }
}

struct VideoThumbnailView: View {
    let post: Post
    let url: URL

    var body: some View {
        ZStack {
            if let thumb = post.muxThumbnailUrl ?? post.thumbnailUrl.flatMap(URL.init) {
                AsyncImage(url: thumb) { img in
                    img.resizable().scaledToFill()
                } placeholder: {
                    Color.spotrCard
                }
            } else {
                Color.spotrCard
            }

            Circle()
                .fill(Color.black.opacity(0.5))
                .frame(width: 48, height: 48)
                .overlay(
                    Image(systemName: "play.fill")
                        .foregroundColor(.white)
                        .font(.system(size: 18))
                        .offset(x: 2)
                )
        }
    }
}

// MARK: - Avatar

struct AvatarView: View {
    let url: String?
    let name: String
    let size: CGFloat

    var body: some View {
        if let urlStr = url, let avatarUrl = URL(string: urlStr) {
            AsyncImage(url: avatarUrl) { img in
                img.resizable().scaledToFill()
            } placeholder: {
                avatarPlaceholder
            }
            .frame(width: size, height: size)
            .clipShape(Circle())
        } else {
            avatarPlaceholder
                .frame(width: size, height: size)
        }
    }

    private var avatarPlaceholder: some View {
        ZStack {
            Circle().fill(Color.spotrDark)
            Text(name.prefix(1).uppercased())
                .font(.system(size: size * 0.4, weight: .bold))
                .foregroundColor(.spotrGreen)
        }
    }
}

// MARK: - String date helper

extension String {
    var relativeDate: String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = formatter.date(from: self) else {
            formatter.formatOptions = [.withInternetDateTime]
            guard let d = formatter.date(from: self) else { return "" }
            return d.relativeFormatted
        }
        return date.relativeFormatted
    }
}

extension Date {
    var relativeFormatted: String {
        let diff = -timeIntervalSinceNow
        if diff < 60 { return "now" }
        if diff < 3600 { return "\(Int(diff/60))m" }
        if diff < 86400 { return "\(Int(diff/3600))h" }
        if diff < 604800 { return "\(Int(diff/86400))d" }
        return "\(Int(diff/604800))w"
    }
}
