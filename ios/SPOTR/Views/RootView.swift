import SwiftUI

struct RootView: View {
    @EnvironmentObject var auth: AuthManager

    var body: some View {
        Group {
            if auth.isLoading {
                ZStack {
                    Color.spotrBlack.ignoresSafeArea()
                    VStack(spacing: 12) {
                        Text("SPOTR")
                            .font(.system(size: 42, weight: .black))
                            .foregroundColor(.spotrGreen)
                        ProgressView()
                            .tint(.spotrGreen)
                    }
                }
            } else if auth.isAuthenticated {
                MainTabView()
            } else {
                LoginView()
            }
        }
        .animation(.easeInOut(duration: 0.3), value: auth.isAuthenticated)
    }
}
