import SwiftUI

@MainActor
final class ProfileViewModel: ObservableObject {
    @Published var user: User?
    @Published var posts: [Post] = []
    @Published var isLoading = false
    @Published var isFollowing = false

    func load(userId: String?, token: String, currentUserId: String?) async {
        isLoading = true
        do {
            if let userId = userId, userId != currentUserId {
                user = try await APIService.shared.fetchUserProfile(userId: userId, token: token)
                posts = try await APIService.shared.fetchUserPosts(userId: userId, token: token)
            } else {
                posts = try await APIService.shared.fetchMyPosts(token: token)
            }
        } catch {}
        isLoading = false
    }

    func deletePost(id: String, token: String) async {
        guard let idx = posts.firstIndex(where: { $0.id == id }) else { return }
        posts.remove(at: idx)
        do { try await APIService.shared.deletePost(id: id, token: token) } catch {}
    }

    func follow(userId: String, token: String) async {
        isFollowing = true
        do { try await APIService.shared.follow(userId: userId, token: token) } catch { isFollowing = false }
    }

    func unfollow(userId: String, token: String) async {
        isFollowing = false
        do { try await APIService.shared.unfollow(userId: userId, token: token) } catch { isFollowing = true }
    }
}

struct ProfileView: View {
    let userId: String?
    @EnvironmentObject var auth: AuthManager
    @StateObject private var vm = ProfileViewModel()
    @State private var selectedPost: Post? = nil

    private var isOwnProfile: Bool {
        userId == nil || userId == auth.currentUser?.id
    }

    private var displayUser: User? {
        isOwnProfile ? auth.currentUser : vm.user
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.spotrBlack.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 0) {
                        // Profile header
                        VStack(spacing: 14) {
                            if let user = displayUser {
                                AvatarView(url: user.avatarUrl, name: user.displayName, size: 80)

                                VStack(spacing: 4) {
                                    Text(user.displayName)
                                        .font(.spotrTitle)
                                        .foregroundColor(.white)

                                    if let sport = user.sport {
                                        Text(sport)
                                            .font(.spotrBody)
                                            .foregroundColor(.spotrGreen)
                                    }

                                    if let bio = user.athleteProfile?.bio {
                                        Text(bio)
                                            .font(.spotrBody)
                                            .foregroundColor(.spotrMuted)
                                            .multilineTextAlignment(.center)
                                            .padding(.horizontal, 32)
                                    }
                                }

                                HStack(spacing: 40) {
                                    StatBlock(value: "\(vm.posts.count)", label: "Posts")
                                    StatBlock(value: "0", label: "Followers")
                                    StatBlock(value: "0", label: "Following")
                                }

                                if !isOwnProfile {
                                    Button(action: toggleFollow) {
                                        Text(vm.isFollowing ? "Following" : "Follow")
                                            .font(.system(size: 14, weight: .semibold))
                                            .foregroundColor(vm.isFollowing ? .white : .black)
                                            .frame(width: 120, height: 36)
                                            .background(vm.isFollowing ? Color.spotrCard : Color.spotrGreen)
                                            .cornerRadius(8)
                                            .overlay(
                                                RoundedRectangle(cornerRadius: 8)
                                                    .stroke(vm.isFollowing ? Color.spotrBorder : Color.clear, lineWidth: 1)
                                            )
                                    }
                                } else {
                                    Button(action: { auth.logout() }) {
                                        Text("Log Out")
                                            .font(.system(size: 14, weight: .semibold))
                                            .foregroundColor(.spotrMuted)
                                            .frame(width: 120, height: 36)
                                            .background(Color.spotrCard)
                                            .cornerRadius(8)
                                            .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.spotrBorder, lineWidth: 1))
                                    }
                                }
                            } else if vm.isLoading {
                                ProgressView().tint(.spotrGreen).padding(40)
                            }
                        }
                        .padding(.vertical, 20)

                        Divider().background(Color.spotrBorder)

                        // Posts grid
                        if vm.posts.isEmpty && !vm.isLoading {
                            VStack(spacing: 12) {
                                Image(systemName: "square.grid.2x2")
                                    .font(.system(size: 40))
                                    .foregroundColor(.spotrMuted)
                                Text("No posts yet")
                                    .font(.spotrBody)
                                    .foregroundColor(.spotrMuted)
                            }
                            .padding(40)
                        } else {
                            PostsGrid(posts: vm.posts, token: auth.token ?? "", onTap: { selectedPost = $0 }, onDelete: { id in
                                guard isOwnProfile else { return }
                                Task { await vm.deletePost(id: id, token: auth.token ?? "") }
                            })
                        }
                    }
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    Text(isOwnProfile ? "Profile" : (displayUser?.displayName ?? "Profile"))
                        .font(.spotrHeadline)
                        .foregroundColor(.white)
                }
            }
        }
        .task {
            await vm.load(userId: userId, token: auth.token ?? "", currentUserId: auth.currentUser?.id)
        }
        .sheet(item: $selectedPost) { post in
            PostDetailSheet(post: post)
        }
    }

    private func toggleFollow() {
        guard let uid = userId ?? vm.user?.id else { return }
        Task {
            if vm.isFollowing {
                await vm.unfollow(userId: uid, token: auth.token ?? "")
            } else {
                await vm.follow(userId: uid, token: auth.token ?? "")
            }
        }
    }
}

private struct StatBlock: View {
    let value: String
    let label: String

    var body: some View {
        VStack(spacing: 2) {
            Text(value)
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(.white)
            Text(label)
                .font(.spotrCaption)
                .foregroundColor(.spotrMuted)
        }
    }
}

private struct PostsGrid: View {
    let posts: [Post]
    let token: String
    let onTap: (Post) -> Void
    let onDelete: (String) -> Void

    private let columns = [GridItem(.flexible(), spacing: 2), GridItem(.flexible(), spacing: 2), GridItem(.flexible(), spacing: 2)]

    var body: some View {
        LazyVGrid(columns: columns, spacing: 2) {
            ForEach(posts) { post in
                GridPostCell(post: post)
                    .onTapGesture { onTap(post) }
                    .contextMenu {
                        Button(role: .destructive) {
                            onDelete(post.id)
                        } label: {
                            Label("Delete", systemImage: "trash")
                        }
                    }
            }
        }
    }
}

private struct GridPostCell: View {
    let post: Post

    var thumbUrl: URL? {
        if let url = post.thumbnailUrl.flatMap(URL.init) { return url }
        if let url = post.muxThumbnailUrl { return url }
        return post.mediaUrl.flatMap(URL.init)
    }

    var body: some View {
        GeometryReader { geo in
            ZStack {
                if let url = thumbUrl {
                    AsyncImage(url: url) { img in
                        img.resizable().scaledToFill()
                    } placeholder: {
                        Color.spotrCard
                    }
                } else {
                    Color.spotrCard
                    Text(post.text.prefix(30))
                        .font(.system(size: 11))
                        .foregroundColor(.spotrMuted)
                        .padding(6)
                        .multilineTextAlignment(.center)
                }

                if post.isReel {
                    VStack {
                        HStack {
                            Spacer()
                            Image(systemName: "play.fill")
                                .font(.system(size: 12))
                                .foregroundColor(.white)
                                .padding(6)
                        }
                        Spacer()
                    }
                }
            }
            .frame(width: geo.size.width, height: geo.size.width)
            .clipped()
        }
        .aspectRatio(1, contentMode: .fit)
    }
}
