import SwiftUI

@MainActor
final class FeedViewModel: ObservableObject {
    @Published var posts: [Post] = []
    @Published var stories: [Post] = []
    @Published var isLoading = false
    @Published var isRefreshing = false
    @Published var error: String?
    private var offset = 0
    private var hasMore = true

    func load(token: String, refresh: Bool = false) async {
        guard !isLoading else { return }
        if refresh {
            offset = 0
            hasMore = true
            isRefreshing = true
        } else {
            guard hasMore else { return }
            isLoading = true
        }
        do {
            async let feedTask = APIService.shared.fetchFeed(token: token, limit: 20, offset: refresh ? 0 : offset)
            async let storiesTask: [Post] = refresh ? APIService.shared.fetchStories(token: token) : []
            let (newPosts, newStories) = try await (feedTask, storiesTask)
            if refresh {
                posts = newPosts
                stories = newStories
            } else {
                posts.append(contentsOf: newPosts)
            }
            offset = posts.count
            hasMore = newPosts.count == 20
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
        isRefreshing = false
    }

    func deletePost(id: String, token: String) async {
        guard let idx = posts.firstIndex(where: { $0.id == id }) else { return }
        posts.remove(at: idx)
        do {
            try await APIService.shared.deletePost(id: id, token: token)
        } catch {}
    }
}

struct FeedView: View {
    @EnvironmentObject var auth: AuthManager
    @StateObject private var vm = FeedViewModel()
    @State private var selectedStoryIndex: Int? = nil
    @State private var selectedPost: Post? = nil

    var body: some View {
        NavigationStack {
            ZStack {
                Color.spotrBlack.ignoresSafeArea()

                ScrollView {
                    LazyVStack(spacing: 0, pinnedViews: []) {
                        // Stories
                        if !vm.stories.isEmpty {
                            StoryBar(stories: vm.stories, selectedStory: $selectedStoryIndex)
                                .background(Color.spotrBlack)

                            Divider().background(Color.spotrBorder)
                        }

                        // Feed posts
                        ForEach(vm.posts) { post in
                            PostCard(
                                post: post,
                                token: auth.token ?? "",
                                onDelete: {
                                    Task { await vm.deletePost(id: post.id, token: auth.token ?? "") }
                                },
                                onTap: { selectedPost = post }
                            )
                            .onAppear {
                                if post.id == vm.posts.last?.id {
                                    Task { await vm.load(token: auth.token ?? "") }
                                }
                            }
                        }

                        if vm.isLoading && !vm.posts.isEmpty {
                            ProgressView()
                                .tint(.spotrGreen)
                                .padding(20)
                        }
                    }
                }
                .refreshable {
                    await vm.load(token: auth.token ?? "", refresh: true)
                }

                if vm.posts.isEmpty && vm.isLoading {
                    ProgressView()
                        .tint(.spotrGreen)
                        .scaleEffect(1.3)
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    Text("SPOTR")
                        .font(.system(size: 22, weight: .black))
                        .foregroundColor(.spotrGreen)
                        .tracking(2)
                }
            }
        }
        .task {
            await vm.load(token: auth.token ?? "", refresh: true)
        }
        .sheet(item: $selectedPost) { post in
            PostDetailSheet(post: post)
        }
        .fullScreenCover(item: Binding(
            get: { selectedStoryIndex.map { StorySelection(index: $0) } },
            set: { selectedStoryIndex = $0?.index }
        )) { sel in
            StoryViewer(stories: vm.stories, startIndex: sel.index) {
                selectedStoryIndex = nil
            }
        }
    }
}

private struct StorySelection: Identifiable {
    let index: Int
    var id: Int { index }
}
