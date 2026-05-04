import SwiftUI

struct PostDetailSheet: View {
    let post: Post
    @EnvironmentObject var auth: AuthManager
    @Environment(\.dismiss) var dismiss

    @State private var comments: [Comment] = []
    @State private var commentText = ""
    @State private var isLoadingComments = false
    @State private var isSubmitting = false
    @State private var isLiked: Bool
    @State private var likeCount: Int

    init(post: Post) {
        self.post = post
        self._isLiked = State(initialValue: post.isLiked)
        self._likeCount = State(initialValue: post._count.likes)
    }

    var body: some View {
        ZStack {
            Color.spotrBlack.ignoresSafeArea()

            VStack(spacing: 0) {
                // Handle
                Capsule()
                    .fill(Color.spotrBorder)
                    .frame(width: 36, height: 4)
                    .padding(.top, 10)
                    .padding(.bottom, 14)

                // Post header
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
                    Text(post.createdAt.relativeDate)
                        .font(.spotrCaption)
                        .foregroundColor(.spotrMuted)
                }
                .padding(.horizontal, 16)

                // Media
                if let mediaUrl = post.mediaUrl, let url = URL(string: mediaUrl) {
                    AsyncImage(url: url) { img in
                        img.resizable().scaledToFit()
                    } placeholder: {
                        Color.spotrCard.frame(height: 200)
                    }
                    .frame(maxWidth: .infinity)
                    .frame(maxHeight: 280)
                    .clipped()
                    .padding(.top, 12)
                }

                // Text
                if !post.text.isEmpty {
                    Text(post.text)
                        .font(.spotrBody)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 16)
                        .padding(.top, 10)
                }

                // Like row
                HStack(spacing: 16) {
                    Button(action: toggleLike) {
                        HStack(spacing: 5) {
                            Image(systemName: isLiked ? "heart.fill" : "heart")
                                .foregroundColor(isLiked ? .red : .spotrMuted)
                            Text("\(likeCount)")
                                .font(.spotrCaption)
                                .foregroundColor(.spotrMuted)
                        }
                    }
                    Text("\(comments.count) comments")
                        .font(.spotrCaption)
                        .foregroundColor(.spotrMuted)
                    Spacer()
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 10)

                Divider().background(Color.spotrBorder)

                // Comments list
                if isLoadingComments {
                    ProgressView().tint(.spotrGreen).padding(20)
                } else {
                    ScrollView {
                        LazyVStack(alignment: .leading, spacing: 14) {
                            ForEach(comments) { comment in
                                CommentRow(comment: comment)
                            }
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 12)
                    }
                }

                Spacer()

                // Comment input
                Divider().background(Color.spotrBorder)
                HStack(spacing: 10) {
                    TextField("Add a comment...", text: $commentText)
                        .font(.spotrBody)
                        .foregroundColor(.white)
                        .padding(.horizontal, 14)
                        .frame(height: 40)
                        .background(Color.spotrCard)
                        .cornerRadius(20)

                    Button(action: submitComment) {
                        if isSubmitting {
                            ProgressView().tint(.spotrGreen)
                        } else {
                            Image(systemName: "paperplane.fill")
                                .foregroundColor(commentText.isEmpty ? .spotrMuted : .spotrGreen)
                                .font(.system(size: 18))
                        }
                    }
                    .disabled(commentText.isEmpty || isSubmitting)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .padding(.bottom, 8)
            }
        }
        .task { await loadComments() }
    }

    private func loadComments() async {
        isLoadingComments = true
        do {
            comments = try await APIService.shared.fetchComments(postId: post.id, token: auth.token ?? "")
        } catch {}
        isLoadingComments = false
    }

    private func submitComment() {
        guard !commentText.trimmingCharacters(in: .whitespaces).isEmpty else { return }
        let text = commentText
        commentText = ""
        isSubmitting = true
        Task {
            do {
                let comment = try await APIService.shared.addComment(postId: post.id, text: text, token: auth.token ?? "")
                comments.append(comment)
            } catch {}
            isSubmitting = false
        }
    }

    private func toggleLike() {
        let wasLiked = isLiked
        isLiked.toggle()
        likeCount += isLiked ? 1 : -1
        Task {
            do {
                if wasLiked {
                    try await APIService.shared.unlikePost(postId: post.id, token: auth.token ?? "")
                } else {
                    try await APIService.shared.likePost(postId: post.id, token: auth.token ?? "")
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

struct CommentRow: View {
    let comment: Comment

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            ZStack {
                Circle().fill(Color.spotrDark)
                Text(comment.user.displayName.prefix(1).uppercased())
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(.spotrGreen)
            }
            .frame(width: 30, height: 30)

            VStack(alignment: .leading, spacing: 2) {
                HStack {
                    Text(comment.user.displayName)
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(.white)
                    Spacer()
                    Text(comment.createdAt.relativeDate)
                        .font(.spotrCaption)
                        .foregroundColor(.spotrMuted)
                }
                Text(comment.text)
                    .font(.spotrBody)
                    .foregroundColor(.white.opacity(0.85))
            }
        }
    }
}
