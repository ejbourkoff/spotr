import SwiftUI
import AVKit

@MainActor
final class ReelsViewModel: ObservableObject {
    @Published var reels: [Post] = []
    @Published var isLoading = false
    private var offset = 0
    private var hasMore = true

    func load(token: String, refresh: Bool = false) async {
        guard !isLoading, (hasMore || refresh) else { return }
        isLoading = true
        if refresh { offset = 0; hasMore = true }
        do {
            let newReels = try await APIService.shared.fetchReels(token: token, limit: 10, offset: refresh ? 0 : offset)
            if refresh {
                reels = newReels
            } else {
                reels.append(contentsOf: newReels)
            }
            offset = reels.count
            hasMore = newReels.count == 10
        } catch {}
        isLoading = false
    }
}

struct ReelsView: View {
    @EnvironmentObject var auth: AuthManager
    @StateObject private var vm = ReelsViewModel()
    @State private var currentIndex = 0

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            if vm.reels.isEmpty && vm.isLoading {
                ProgressView().tint(.spotrGreen).scaleEffect(1.3)
            } else if vm.reels.isEmpty {
                VStack(spacing: 12) {
                    Image(systemName: "play.rectangle.fill")
                        .font(.system(size: 44))
                        .foregroundColor(.spotrMuted)
                    Text("No reels yet")
                        .font(.spotrBody)
                        .foregroundColor(.spotrMuted)
                }
            } else {
                TabView(selection: $currentIndex) {
                    ForEach(Array(vm.reels.enumerated()), id: \.element.id) { index, reel in
                        ReelCell(reel: reel, token: auth.token ?? "", isActive: currentIndex == index)
                            .tag(index)
                            .ignoresSafeArea()
                            .onAppear {
                                if index == vm.reels.count - 2 {
                                    Task { await vm.load(token: auth.token ?? "") }
                                }
                            }
                    }
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
                .ignoresSafeArea()
            }
        }
        .task {
            await vm.load(token: auth.token ?? "", refresh: true)
        }
    }
}

struct ReelCell: View {
    let reel: Post
    let token: String
    let isActive: Bool

    @State private var player: AVPlayer?
    @State private var isLiked: Bool
    @State private var likeCount: Int
    @State private var showComments = false

    init(reel: Post, token: String, isActive: Bool) {
        self.reel = reel
        self.token = token
        self.isActive = isActive
        self._isLiked = State(initialValue: reel.isLiked)
        self._likeCount = State(initialValue: reel._count.likes)
    }

    var body: some View {
        ZStack {
            Color.black

            // Video player
            if let player = player {
                VideoPlayer(player: player)
                    .ignoresSafeArea()
                    .disabled(true)
            } else if let thumb = reel.muxThumbnailUrl ?? reel.thumbnailUrl.flatMap(URL.init) {
                AsyncImage(url: thumb) { img in
                    img.resizable().scaledToFill()
                } placeholder: { Color.black }
                .ignoresSafeArea()
            }

            // Gradient
            LinearGradient(
                colors: [.clear, .black.opacity(0.8)],
                startPoint: .center,
                endPoint: .bottom
            )
            .ignoresSafeArea()

            // Overlay UI
            VStack {
                Spacer()
                HStack(alignment: .bottom) {
                    // Left: author + caption
                    VStack(alignment: .leading, spacing: 6) {
                        HStack(spacing: 8) {
                            AvatarView(url: reel.author.avatarUrl, name: reel.author.displayName, size: 34)
                            Text(reel.author.displayName)
                                .font(.spotrHeadline)
                                .foregroundColor(.white)
                        }
                        if !reel.text.isEmpty {
                            Text(reel.text)
                                .font(.spotrBody)
                                .foregroundColor(.white.opacity(0.9))
                                .lineLimit(2)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.leading, 16)

                    // Right: actions
                    VStack(spacing: 24) {
                        ReelActionButton(
                            icon: isLiked ? "heart.fill" : "heart",
                            label: "\(likeCount)",
                            color: isLiked ? .red : .white,
                            action: toggleLike
                        )
                        ReelActionButton(
                            icon: "bubble.left",
                            label: "\(reel._count.comments)",
                            color: .white,
                            action: { showComments = true }
                        )
                    }
                    .padding(.trailing, 16)
                }
                .padding(.bottom, 100)
            }
        }
        .onAppear { setupPlayer() }
        .onDisappear { teardownPlayer() }
        .onChange(of: isActive) { active in
            active ? player?.play() : player?.pause()
        }
        .sheet(isPresented: $showComments) {
            PostDetailSheet(post: reel)
        }
    }

    private func setupPlayer() {
        guard let url = reel.muxStreamUrl else { return }
        let p = AVPlayer(url: url)
        p.actionAtItemEnd = .none
        NotificationCenter.default.addObserver(
            forName: .AVPlayerItemDidPlayToEndTime,
            object: p.currentItem,
            queue: .main
        ) { _ in p.seek(to: .zero); p.play() }
        player = p
        if isActive { p.play() }
    }

    private func teardownPlayer() {
        player?.pause()
        player = nil
    }

    private func toggleLike() {
        let wasLiked = isLiked
        isLiked.toggle()
        likeCount += isLiked ? 1 : -1
        Task {
            do {
                if wasLiked {
                    try await APIService.shared.unlikePost(postId: reel.id, token: token)
                } else {
                    try await APIService.shared.likePost(postId: reel.id, token: token)
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

struct ReelActionButton: View {
    let icon: String
    let label: String
    let color: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.system(size: 26))
                    .foregroundColor(color)
                Text(label)
                    .font(.spotrCaption)
                    .foregroundColor(.white)
            }
        }
    }
}
