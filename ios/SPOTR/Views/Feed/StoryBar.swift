import SwiftUI

struct StoryBar: View {
    let stories: [Post]
    @Binding var selectedStory: Int?

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 14) {
                ForEach(Array(stories.enumerated()), id: \.element.id) { index, story in
                    StoryCircle(story: story) {
                        selectedStory = index
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
        }
    }
}

struct StoryCircle: View {
    let story: Post
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 5) {
                ZStack {
                    Circle()
                        .stroke(Color.spotrGreen, lineWidth: 2.5)
                        .frame(width: 66, height: 66)

                    Group {
                        if let url = story.thumbnailUrl.flatMap(URL.init) {
                            AsyncImage(url: url) { img in
                                img.resizable().scaledToFill()
                            } placeholder: {
                                Color.spotrCard
                            }
                        } else if let url = story.mediaUrl.flatMap(URL.init) {
                            AsyncImage(url: url) { img in
                                img.resizable().scaledToFill()
                            } placeholder: {
                                Color.spotrCard
                            }
                        } else {
                            ZStack {
                                Color.spotrCard
                                Text(story.author.displayName.prefix(1))
                                    .font(.system(size: 22, weight: .bold))
                                    .foregroundColor(.spotrGreen)
                            }
                        }
                    }
                    .frame(width: 60, height: 60)
                    .clipShape(Circle())
                }

                Text(story.author.displayName.components(separatedBy: " ").first ?? "")
                    .font(.system(size: 11))
                    .foregroundColor(.spotrMuted)
                    .lineLimit(1)
                    .frame(width: 66)
            }
        }
    }
}
