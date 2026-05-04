import SwiftUI

struct MainTabView: View {
    @EnvironmentObject var auth: AuthManager
    @State private var selectedTab = 0
    @State private var showCreate = false

    var body: some View {
        ZStack(alignment: .bottom) {
            // Tab content
            Group {
                switch selectedTab {
                case 0:
                    FeedView()
                case 1:
                    DiscoverView()
                case 3:
                    ReelsView()
                case 4:
                    ProfileView(userId: nil)
                default:
                    FeedView()
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .ignoresSafeArea()

            // Custom tab bar
            VStack(spacing: 0) {
                Divider()
                    .background(Color.spotrBorder)
                HStack(spacing: 0) {
                    TabBarButton(icon: "house.fill", label: "Feed", index: 0, selected: $selectedTab)
                    TabBarButton(icon: "magnifyingglass", label: "Discover", index: 1, selected: $selectedTab)

                    // Center create button
                    Button(action: { showCreate = true }) {
                        ZStack {
                            Circle()
                                .fill(Color.spotrGreen)
                                .frame(width: 52, height: 52)
                            Image(systemName: "plus")
                                .font(.system(size: 22, weight: .bold))
                                .foregroundColor(.black)
                        }
                    }
                    .frame(maxWidth: .infinity)

                    TabBarButton(icon: "play.rectangle.fill", label: "Reels", index: 3, selected: $selectedTab)
                    TabBarButton(icon: "person.fill", label: "Profile", index: 4, selected: $selectedTab)
                }
                .padding(.horizontal, 8)
                .padding(.top, 10)
                .padding(.bottom, safeAreaBottom > 0 ? safeAreaBottom : 16)
                .background(Color.spotrDark)
            }
        }
        .sheet(isPresented: $showCreate) {
            CreatePostView()
        }
        .ignoresSafeArea(edges: .bottom)
    }

    private var safeAreaBottom: CGFloat {
        (UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .first?.windows.first?.safeAreaInsets.bottom) ?? 0
    }
}

private struct TabBarButton: View {
    let icon: String
    let label: String
    let index: Int
    @Binding var selected: Int

    var isSelected: Bool { selected == index }

    var body: some View {
        Button(action: { selected = index }) {
            VStack(spacing: 3) {
                Image(systemName: icon)
                    .font(.system(size: 22))
                    .foregroundColor(isSelected ? .spotrGreen : .spotrMuted)
                Text(label)
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(isSelected ? .spotrGreen : .spotrMuted)
            }
            .frame(maxWidth: .infinity)
        }
    }
}
