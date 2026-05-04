import SwiftUI

@MainActor
final class MessagesViewModel: ObservableObject {
    @Published var messages: [Message] = []
    @Published var isLoading = false
    @Published var error: String?

    func load(token: String) async {
        isLoading = true
        do {
            messages = try await APIService.shared.fetchMessages(token: token)
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    func sendMessage(receiverId: String, subject: String, body: String, token: String) async throws -> Message {
        let msg = try await APIService.shared.sendMessage(receiverId: receiverId, subject: subject, body: body, token: token)
        messages.insert(msg, at: 0)
        return msg
    }
}

struct MessagesView: View {
    @EnvironmentObject var auth: AuthManager
    @StateObject private var vm = MessagesViewModel()
    @State private var showCompose = false

    var body: some View {
        NavigationStack {
            ZStack {
                Color.spotrBlack.ignoresSafeArea()

                if vm.isLoading && vm.messages.isEmpty {
                    ProgressView().tint(.spotrGreen).scaleEffect(1.3)
                } else if vm.messages.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "envelope")
                            .font(.system(size: 44))
                            .foregroundColor(.spotrMuted)
                        Text("No messages yet")
                            .font(.spotrBody)
                            .foregroundColor(.spotrMuted)
                        Button("Send a message") { showCompose = true }
                            .font(.spotrBody)
                            .foregroundColor(.spotrGreen)
                    }
                } else {
                    List(vm.messages) { message in
                        MessageRow(message: message, currentUserId: auth.currentUser?.id ?? "")
                            .listRowBackground(Color.spotrBlack)
                            .listRowSeparatorTint(Color.spotrBorder)
                    }
                    .listStyle(.plain)
                    .scrollContentBackground(.hidden)
                    .refreshable {
                        await vm.load(token: auth.token ?? "")
                    }
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    Text("Messages")
                        .font(.spotrHeadline)
                        .foregroundColor(.white)
                }
                ToolbarItem(placement: .primaryAction) {
                    Button(action: { showCompose = true }) {
                        Image(systemName: "square.and.pencil")
                            .foregroundColor(.spotrGreen)
                    }
                }
            }
        }
        .task { await vm.load(token: auth.token ?? "") }
        .sheet(isPresented: $showCompose) {
            ComposeMessageView { receiverId, subject, body in
                Task { try? await vm.sendMessage(receiverId: receiverId, subject: subject, body: body, token: auth.token ?? "") }
            }
        }
    }
}

struct MessageRow: View {
    let message: Message
    let currentUserId: String

    private var isIncoming: Bool { message.senderId != currentUserId }
    private var otherUser: MessageUser? { isIncoming ? message.sender : message.receiver }
    private var isUnread: Bool { isIncoming && message.readAt == nil }

    var body: some View {
        HStack(spacing: 12) {
            AvatarView(url: otherUser?.avatarUrl, name: otherUser?.displayName ?? "?", size: 44)

            VStack(alignment: .leading, spacing: 3) {
                HStack {
                    Text(otherUser?.displayName ?? "Unknown")
                        .font(.spotrHeadline)
                        .foregroundColor(.white)
                    if isUnread {
                        Circle()
                            .fill(Color.spotrGreen)
                            .frame(width: 8, height: 8)
                    }
                    Spacer()
                    Text(message.createdAt.relativeDate)
                        .font(.spotrCaption)
                        .foregroundColor(.spotrMuted)
                }
                Text(message.subject)
                    .font(.spotrBody)
                    .foregroundColor(isUnread ? .white : .spotrMuted)
                    .lineLimit(1)
                Text(message.body)
                    .font(.spotrCaption)
                    .foregroundColor(.spotrMuted)
                    .lineLimit(1)
            }
        }
        .padding(.vertical, 6)
    }
}

struct ComposeMessageView: View {
    let onSend: (String, String, String) -> Void
    @EnvironmentObject var auth: AuthManager
    @Environment(\.dismiss) var dismiss

    @State private var searchQuery = ""
    @State private var searchResults: [SearchUser] = []
    @State private var selectedUser: SearchUser? = nil
    @State private var subject = ""
    @State private var body = ""
    @State private var isSending = false
    @State private var isSearching = false

    var body: some View {
        NavigationStack {
            ZStack {
                Color.spotrBlack.ignoresSafeArea()

                VStack(spacing: 0) {
                    if selectedUser == nil {
                        // User search
                        VStack(spacing: 0) {
                            HStack(spacing: 10) {
                                Image(systemName: "magnifyingglass")
                                    .foregroundColor(.spotrMuted)
                                TextField("Search users...", text: $searchQuery)
                                    .font(.spotrBody)
                                    .foregroundColor(.white)
                                    .autocapitalization(.none)
                                    .autocorrectionDisabled()
                            }
                            .padding(12)
                            .background(Color.spotrCard)
                            .cornerRadius(10)
                            .padding(16)

                            if isSearching {
                                ProgressView().tint(.spotrGreen).padding(20)
                            }

                            List(searchResults) { user in
                                Button(action: { selectedUser = user }) {
                                    HStack(spacing: 10) {
                                        AvatarView(url: user.avatarUrl, name: user.displayName, size: 36)
                                        VStack(alignment: .leading, spacing: 1) {
                                            Text(user.displayName)
                                                .font(.spotrHeadline)
                                                .foregroundColor(.white)
                                            Text(user.role.capitalized)
                                                .font(.spotrCaption)
                                                .foregroundColor(.spotrMuted)
                                        }
                                        Spacer()
                                    }
                                }
                                .listRowBackground(Color.spotrBlack)
                                .listRowSeparatorTint(Color.spotrBorder)
                            }
                            .listStyle(.plain)
                            .scrollContentBackground(.hidden)
                        }
                    } else {
                        // Compose form
                        ScrollView {
                            VStack(spacing: 16) {
                                HStack(spacing: 10) {
                                    AvatarView(url: selectedUser?.avatarUrl, name: selectedUser?.displayName ?? "", size: 36)
                                    Text("To: \(selectedUser?.displayName ?? "")")
                                        .font(.spotrHeadline)
                                        .foregroundColor(.white)
                                    Spacer()
                                    Button(action: { selectedUser = nil }) {
                                        Image(systemName: "xmark.circle.fill")
                                            .foregroundColor(.spotrMuted)
                                    }
                                }
                                .padding(.horizontal, 16)
                                .padding(.top, 12)

                                SPOTRTextField(placeholder: "Subject", text: $subject)
                                    .padding(.horizontal, 16)

                                ZStack(alignment: .topLeading) {
                                    if body.isEmpty {
                                        Text("Message...")
                                            .font(.spotrBody)
                                            .foregroundColor(.spotrMuted)
                                            .padding(.horizontal, 16)
                                            .padding(.top, 8)
                                    }
                                    TextEditor(text: $body)
                                        .font(.spotrBody)
                                        .foregroundColor(.white)
                                        .scrollContentBackground(.hidden)
                                        .frame(minHeight: 120)
                                        .padding(.horizontal, 12)
                                        .background(Color.spotrCard)
                                        .cornerRadius(10)
                                        .padding(.horizontal, 16)
                                }
                            }
                        }
                    }
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                        .foregroundColor(.spotrMuted)
                }
                ToolbarItem(placement: .principal) {
                    Text("New Message")
                        .font(.spotrHeadline)
                        .foregroundColor(.white)
                }
                if selectedUser != nil {
                    ToolbarItem(placement: .primaryAction) {
                        Button(action: send) {
                            if isSending {
                                ProgressView().tint(.black)
                            } else {
                                Text("Send")
                                    .font(.system(size: 14, weight: .bold))
                                    .foregroundColor(.black)
                                    .frame(width: 60, height: 32)
                                    .background(subject.isEmpty || body.isEmpty ? Color.spotrGreen.opacity(0.4) : Color.spotrGreen)
                                    .cornerRadius(8)
                            }
                        }
                        .disabled(subject.isEmpty || body.isEmpty || isSending)
                    }
                }
            }
            .onChange(of: searchQuery) { q in
                guard q.count >= 2 else { searchResults = []; return }
                Task { await search(query: q) }
            }
        }
    }

    private func search(query: String) async {
        isSearching = true
        do {
            searchResults = try await APIService.shared.searchUsers(query: query, token: auth.token ?? "")
        } catch {}
        isSearching = false
    }

    private func send() {
        guard let user = selectedUser else { return }
        isSending = true
        onSend(user.id, subject, body)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            dismiss()
        }
    }
}
