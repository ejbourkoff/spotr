import SwiftUI

struct StoryViewer: View {
    let stories: [Post]
    let startIndex: Int
    let onDismiss: () -> Void

    @State private var current: Int
    @State private var progress: CGFloat = 0
    @State private var isPaused = false
    @State private var timer: Timer?

    private let duration: Double = 5.0

    init(stories: [Post], startIndex: Int, onDismiss: @escaping () -> Void) {
        self.stories = stories
        self.startIndex = startIndex
        self.onDismiss = onDismiss
        self._current = State(initialValue: startIndex)
    }

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            // Story media
            if current < stories.count {
                let story = stories[current]
                Group {
                    if let url = story.mediaUrl.flatMap(URL.init) {
                        AsyncImage(url: url) { img in
                            img.resizable().scaledToFit()
                        } placeholder: {
                            Color.black
                        }
                    } else {
                        ZStack {
                            Color.spotrDark
                            VStack(spacing: 16) {
                                AvatarView(url: story.author.avatarUrl, name: story.author.displayName, size: 80)
                                Text(story.text)
                                    .font(.spotrBody)
                                    .foregroundColor(.white)
                                    .multilineTextAlignment(.center)
                                    .padding(.horizontal, 32)
                            }
                        }
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }

            // Gradient overlays
            VStack {
                LinearGradient(colors: [.black.opacity(0.5), .clear], startPoint: .top, endPoint: .bottom)
                    .frame(height: 120)
                Spacer()
                LinearGradient(colors: [.clear, .black.opacity(0.6)], startPoint: .top, endPoint: .bottom)
                    .frame(height: 140)
            }

            VStack {
                // Progress bars
                HStack(spacing: 3) {
                    ForEach(0..<stories.count, id: \.self) { i in
                        StoryProgressBar(
                            isCurrent: i == current,
                            isCompleted: i < current,
                            progress: i == current ? progress : (i < current ? 1.0 : 0.0)
                        )
                    }
                }
                .padding(.horizontal, 12)
                .padding(.top, 12)

                // Header
                if current < stories.count {
                    HStack(spacing: 10) {
                        AvatarView(
                            url: stories[current].author.avatarUrl,
                            name: stories[current].author.displayName,
                            size: 36
                        )
                        VStack(alignment: .leading, spacing: 1) {
                            Text(stories[current].author.displayName)
                                .font(.spotrHeadline)
                                .foregroundColor(.white)
                            Text(stories[current].createdAt.relativeDate)
                                .font(.spotrCaption)
                                .foregroundColor(.white.opacity(0.7))
                        }
                        Spacer()
                        Button(action: onDismiss) {
                            Image(systemName: "xmark")
                                .foregroundColor(.white)
                                .font(.system(size: 18, weight: .medium))
                                .padding(8)
                        }
                    }
                    .padding(.horizontal, 14)
                    .padding(.top, 6)
                }

                Spacer()

                // Caption
                if current < stories.count, !stories[current].text.isEmpty {
                    Text(stories[current].text)
                        .font(.spotrBody)
                        .foregroundColor(.white)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 24)
                        .padding(.bottom, 48)
                }
            }

            // Tap zones
            HStack(spacing: 0) {
                Color.clear
                    .contentShape(Rectangle())
                    .onTapGesture { goBack() }
                    .frame(maxWidth: .infinity)

                Color.clear
                    .contentShape(Rectangle())
                    .onTapGesture { goForward() }
                    .frame(maxWidth: .infinity)
            }
            .simultaneousGesture(
                LongPressGesture(minimumDuration: 0.2)
                    .onChanged { _ in pause() }
                    .sequenced(before: DragGesture(minimumDistance: 0))
                    .onEnded { _ in resume() }
            )
        }
        .onAppear { startTimer() }
        .onDisappear { stopTimer() }
    }

    private func startTimer() {
        stopTimer()
        guard !isPaused else { return }
        timer = Timer.scheduledTimer(withTimeInterval: 0.05, repeats: true) { _ in
            Task { @MainActor in
                progress += 0.05 / duration
                if progress >= 1.0 {
                    goForward()
                }
            }
        }
    }

    private func stopTimer() {
        timer?.invalidate()
        timer = nil
    }

    private func pause() {
        isPaused = true
        stopTimer()
    }

    private func resume() {
        isPaused = false
        startTimer()
    }

    private func goForward() {
        if current < stories.count - 1 {
            current += 1
            progress = 0
            startTimer()
        } else {
            onDismiss()
        }
    }

    private func goBack() {
        if current > startIndex {
            current -= 1
            progress = 0
            startTimer()
        } else if current > 0 {
            current -= 1
            progress = 0
            startTimer()
        } else {
            progress = 0
            startTimer()
        }
    }
}

struct StoryProgressBar: View {
    let isCurrent: Bool
    let isCompleted: Bool
    let progress: CGFloat

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                RoundedRectangle(cornerRadius: 2)
                    .fill(Color.white.opacity(0.3))
                RoundedRectangle(cornerRadius: 2)
                    .fill(Color.white)
                    .frame(width: geo.size.width * min(progress, 1.0))
            }
        }
        .frame(height: 3)
    }
}
