import SwiftUI

@MainActor
final class DiscoverViewModel: ObservableObject {
    @Published var athletes: [SearchUser] = []
    @Published var searchResults: [SearchUser] = []
    @Published var isLoading = false
    @Published var isSearching = false
    @Published var selectedSport: String? = nil

    let sports = ["All", "Basketball", "Football", "Soccer", "Baseball", "Tennis", "Track", "Swimming", "Volleyball", "Lacrosse", "Hockey"]

    func loadAthletes(token: String) async {
        isLoading = true
        do {
            athletes = try await APIService.shared.fetchAthletes(sport: selectedSport, token: token)
        } catch {}
        isLoading = false
    }

    func search(query: String, token: String) async {
        guard query.count >= 2 else { searchResults = []; return }
        isSearching = true
        do {
            searchResults = try await APIService.shared.searchUsers(query: query, token: token)
        } catch {}
        isSearching = false
    }
}

struct DiscoverView: View {
    @EnvironmentObject var auth: AuthManager
    @StateObject private var vm = DiscoverViewModel()
    @State private var searchText = ""
    @State private var selectedProfile: SearchUser? = nil

    var displayList: [SearchUser] {
        searchText.count >= 2 ? vm.searchResults : vm.athletes
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.spotrBlack.ignoresSafeArea()

                VStack(spacing: 0) {
                    // Search bar
                    HStack(spacing: 10) {
                        Image(systemName: "magnifyingglass")
                            .foregroundColor(.spotrMuted)
                            .font(.system(size: 16))
                        TextField("Search athletes, coaches, brands...", text: $searchText)
                            .font(.spotrBody)
                            .foregroundColor(.white)
                            .autocapitalization(.none)
                            .autocorrectionDisabled()
                        if !searchText.isEmpty {
                            Button(action: { searchText = "" }) {
                                Image(systemName: "xmark.circle.fill")
                                    .foregroundColor(.spotrMuted)
                            }
                        }
                    }
                    .padding(12)
                    .background(Color.spotrCard)
                    .cornerRadius(10)
                    .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.spotrBorder, lineWidth: 1))
                    .padding(.horizontal, 16)
                    .padding(.top, 8)
                    .padding(.bottom, 12)

                    // Sport filter chips (only when not searching)
                    if searchText.isEmpty {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 8) {
                                ForEach(vm.sports, id: \.self) { sport in
                                    let isSelected = sport == "All" ? vm.selectedSport == nil : vm.selectedSport == sport
                                    Button(action: {
                                        vm.selectedSport = (sport == "All") ? nil : sport
                                        Task { await vm.loadAthletes(token: auth.token ?? "") }
                                    }) {
                                        Text(sport)
                                            .font(.system(size: 13, weight: .medium))
                                            .foregroundColor(isSelected ? .black : .white)
                                            .padding(.horizontal, 14)
                                            .padding(.vertical, 7)
                                            .background(isSelected ? Color.spotrGreen : Color.spotrCard)
                                            .cornerRadius(20)
                                            .overlay(
                                                Capsule()
                                                    .stroke(isSelected ? Color.clear : Color.spotrBorder, lineWidth: 1)
                                            )
                                    }
                                }
                            }
                            .padding(.horizontal, 16)
                        }
                        .padding(.bottom, 8)
                    }

                    Divider().background(Color.spotrBorder)

                    // Results
                    if (vm.isLoading || vm.isSearching) && displayList.isEmpty {
                        Spacer()
                        ProgressView().tint(.spotrGreen).scaleEffect(1.2)
                        Spacer()
                    } else if displayList.isEmpty {
                        Spacer()
                        VStack(spacing: 12) {
                            Image(systemName: "person.3")
                                .font(.system(size: 44))
                                .foregroundColor(.spotrMuted)
                            Text(searchText.isEmpty ? "No athletes found" : "No results for \"\(searchText)\"")
                                .font(.spotrBody)
                                .foregroundColor(.spotrMuted)
                        }
                        Spacer()
                    } else {
                        List(displayList) { user in
                            Button(action: { selectedProfile = user }) {
                                AthleteRow(user: user)
                            }
                            .listRowBackground(Color.spotrBlack)
                            .listRowSeparatorTint(Color.spotrBorder)
                        }
                        .listStyle(.plain)
                        .scrollContentBackground(.hidden)
                        .refreshable {
                            await vm.loadAthletes(token: auth.token ?? "")
                        }
                    }
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    Text("Discover")
                        .font(.spotrHeadline)
                        .foregroundColor(.white)
                }
            }
        }
        .task { await vm.loadAthletes(token: auth.token ?? "") }
        .onChange(of: searchText) { q in
            Task { await vm.search(query: q, token: auth.token ?? "") }
        }
        .sheet(item: $selectedProfile) { user in
            ProfileView(userId: user.id)
        }
    }
}

struct AthleteRow: View {
    let user: SearchUser

    var body: some View {
        HStack(spacing: 12) {
            AvatarView(url: user.avatarUrl, name: user.displayName, size: 46)

            VStack(alignment: .leading, spacing: 3) {
                Text(user.displayName)
                    .font(.spotrHeadline)
                    .foregroundColor(.white)

                if let sport = user.athleteProfile?.sport {
                    HStack(spacing: 6) {
                        Text(sport)
                            .font(.spotrCaption)
                            .foregroundColor(.spotrGreen)
                        if let school = user.athleteProfile?.schoolTeam {
                            Text("·")
                                .foregroundColor(.spotrMuted)
                            Text(school)
                                .font(.spotrCaption)
                                .foregroundColor(.spotrMuted)
                        }
                    }
                } else if let org = user.coachProfile?.organization {
                    Text(org)
                        .font(.spotrCaption)
                        .foregroundColor(.spotrMuted)
                } else if let brandType = user.brandProfile?.organizationType {
                    Text(brandType)
                        .font(.spotrCaption)
                        .foregroundColor(.spotrMuted)
                }
            }

            Spacer()

            RoleBadge(role: user.role)
        }
        .padding(.vertical, 4)
    }
}

struct RoleBadge: View {
    let role: String

    var label: String {
        switch role {
        case "ATHLETE": return "Athlete"
        case "COACH": return "Coach"
        case "BRAND": return "Brand"
        default: return "Fan"
        }
    }

    var color: Color {
        switch role {
        case "ATHLETE": return .spotrGreen
        case "COACH": return .blue
        case "BRAND": return .orange
        default: return .spotrMuted
        }
    }

    var body: some View {
        Text(label)
            .font(.system(size: 11, weight: .semibold))
            .foregroundColor(color)
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(color.opacity(0.15))
            .cornerRadius(6)
    }
}
