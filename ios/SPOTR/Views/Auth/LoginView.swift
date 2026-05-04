import SwiftUI

struct LoginView: View {
    @EnvironmentObject var auth: AuthManager
    @State private var email = ""
    @State private var password = ""
    @State private var isLoading = false
    @State private var error: String?
    @State private var showSignup = false

    var body: some View {
        ZStack {
            Color.spotrBlack.ignoresSafeArea()

            VStack(spacing: 0) {
                Spacer()

                // Logo
                VStack(spacing: 8) {
                    Text("SPOTR")
                        .font(.system(size: 52, weight: .black))
                        .foregroundColor(.spotrGreen)
                        .tracking(4)
                    Text("Your sports network")
                        .font(.spotrBody)
                        .foregroundColor(.spotrMuted)
                }
                .padding(.bottom, 56)

                // Fields
                VStack(spacing: 14) {
                    SPOTRTextField(placeholder: "Email", text: $email, keyboard: .emailAddress)
                    SPOTRTextField(placeholder: "Password", text: $password, isSecure: true)
                }
                .padding(.horizontal, 28)

                if let error {
                    Text(error)
                        .font(.spotrCaption)
                        .foregroundColor(.red)
                        .padding(.top, 12)
                        .padding(.horizontal, 28)
                }

                // Login button
                Button(action: login) {
                    Group {
                        if isLoading {
                            ProgressView().tint(.black)
                        } else {
                            Text("Sign In")
                                .font(.system(size: 16, weight: .bold))
                                .foregroundColor(.black)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 52)
                    .background(Color.spotrGreen)
                    .cornerRadius(12)
                }
                .disabled(isLoading || email.isEmpty || password.isEmpty)
                .opacity((email.isEmpty || password.isEmpty) ? 0.6 : 1)
                .padding(.horizontal, 28)
                .padding(.top, 24)

                Spacer()

                // Sign up
                Button(action: { showSignup = true }) {
                    HStack(spacing: 4) {
                        Text("Don't have an account?")
                            .foregroundColor(.spotrMuted)
                        Text("Sign Up")
                            .foregroundColor(.spotrGreen)
                            .fontWeight(.semibold)
                    }
                    .font(.spotrBody)
                }
                .padding(.bottom, 32)
            }
        }
        .sheet(isPresented: $showSignup) {
            SignupView()
        }
    }

    private func login() {
        isLoading = true
        error = nil
        Task {
            do {
                try await auth.login(email: email.lowercased().trimmingCharacters(in: .whitespaces), password: password)
            } catch {
                self.error = error.localizedDescription
            }
            isLoading = false
        }
    }
}

// MARK: - Reusable text field

struct SPOTRTextField: View {
    let placeholder: String
    @Binding var text: String
    var keyboard: UIKeyboardType = .default
    var isSecure: Bool = false

    var body: some View {
        Group {
            if isSecure {
                SecureField(placeholder, text: $text)
            } else {
                TextField(placeholder, text: $text)
                    .keyboardType(keyboard)
                    .autocapitalization(.none)
                    .autocorrectionDisabled()
            }
        }
        .foregroundColor(.white)
        .padding(.horizontal, 16)
        .frame(height: 52)
        .background(Color.spotrCard)
        .cornerRadius(10)
        .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.spotrBorder, lineWidth: 1))
    }
}
