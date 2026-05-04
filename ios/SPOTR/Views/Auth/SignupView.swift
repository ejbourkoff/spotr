import SwiftUI

struct SignupView: View {
    @EnvironmentObject var auth: AuthManager
    @Environment(\.dismiss) var dismiss
    @State private var email = ""
    @State private var password = ""
    @State private var selectedRole = "ATHLETE"
    @State private var isLoading = false
    @State private var error: String?

    private let roles = [
        ("ATHLETE", "🏅", "Athlete", "Post highlights, get recruited, earn NIL"),
        ("COACH", "📋", "Coach", "Discover talent, build recruiting lists"),
        ("BRAND", "🏢", "Brand", "Find athletes for NIL partnerships"),
        ("FAN", "👊", "Fan", "Follow athletes, watch highlights"),
    ]

    var body: some View {
        ZStack {
            Color.spotrBlack.ignoresSafeArea()

            ScrollView {
                VStack(spacing: 0) {
                    // Header
                    HStack {
                        Button(action: { dismiss() }) {
                            Image(systemName: "xmark")
                                .foregroundColor(.spotrMuted)
                                .font(.system(size: 18, weight: .medium))
                        }
                        Spacer()
                        Text("Create Account")
                            .font(.spotrHeadline)
                            .foregroundColor(.white)
                        Spacer()
                        Color.clear.frame(width: 24)
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 20)
                    .padding(.bottom, 28)

                    // Role picker
                    VStack(alignment: .leading, spacing: 10) {
                        Text("I am a...")
                            .font(.spotrCaption)
                            .foregroundColor(.spotrMuted)
                            .padding(.horizontal, 28)

                        VStack(spacing: 10) {
                            ForEach(roles, id: \.0) { role in
                                RoleTile(
                                    emoji: role.1,
                                    title: role.2,
                                    subtitle: role.3,
                                    isSelected: selectedRole == role.0
                                ) {
                                    selectedRole = role.0
                                }
                            }
                        }
                        .padding(.horizontal, 20)
                    }

                    // Fields
                    VStack(spacing: 14) {
                        SPOTRTextField(placeholder: "Email", text: $email, keyboard: .emailAddress)
                        SPOTRTextField(placeholder: "Password (8+ chars)", text: $password, isSecure: true)
                    }
                    .padding(.horizontal, 28)
                    .padding(.top, 24)

                    if let error {
                        Text(error)
                            .font(.spotrCaption)
                            .foregroundColor(.red)
                            .padding(.top, 10)
                            .padding(.horizontal, 28)
                    }

                    Button(action: signup) {
                        Group {
                            if isLoading {
                                ProgressView().tint(.black)
                            } else {
                                Text("Create Account")
                                    .font(.system(size: 16, weight: .bold))
                                    .foregroundColor(.black)
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 52)
                        .background(Color.spotrGreen)
                        .cornerRadius(12)
                    }
                    .disabled(isLoading || email.isEmpty || password.count < 6)
                    .opacity((email.isEmpty || password.count < 6) ? 0.6 : 1)
                    .padding(.horizontal, 28)
                    .padding(.top, 24)
                    .padding(.bottom, 48)
                }
            }
        }
    }

    private func signup() {
        isLoading = true
        error = nil
        Task {
            do {
                try await auth.signup(
                    email: email.lowercased().trimmingCharacters(in: .whitespaces),
                    password: password,
                    role: selectedRole
                )
                dismiss()
            } catch {
                self.error = error.localizedDescription
            }
            isLoading = false
        }
    }
}

struct RoleTile: View {
    let emoji: String
    let title: String
    let subtitle: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 14) {
                Text(emoji)
                    .font(.system(size: 26))
                    .frame(width: 44, height: 44)
                    .background(Color.spotrDark)
                    .cornerRadius(10)

                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.spotrHeadline)
                        .foregroundColor(.white)
                    Text(subtitle)
                        .font(.spotrCaption)
                        .foregroundColor(.spotrMuted)
                }
                Spacer()
                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .foregroundColor(isSelected ? .spotrGreen : .spotrBorder)
                    .font(.system(size: 22))
            }
            .padding(14)
            .background(isSelected ? Color.spotrGreen.opacity(0.08) : Color.spotrCard)
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(isSelected ? Color.spotrGreen : Color.spotrBorder, lineWidth: 1)
            )
        }
    }
}
