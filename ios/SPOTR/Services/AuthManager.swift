import Foundation
import SwiftUI

@MainActor
final class AuthManager: ObservableObject {
    @Published var isAuthenticated = false
    @Published var currentUser: User?
    @Published var token: String?
    @Published var isLoading = true

    private let tokenKey = "spotr_jwt"

    init() {
        Task { await loadStoredToken() }
    }

    private func loadStoredToken() async {
        if let stored = KeychainHelper.read(key: tokenKey) {
            token = stored
            isAuthenticated = true
        }
        isLoading = false
    }

    func login(email: String, password: String) async throws {
        let response = try await APIService.shared.login(email: email, password: password)
        token = response.token
        currentUser = response.user
        isAuthenticated = true
        KeychainHelper.save(key: tokenKey, value: response.token)
    }

    func signup(email: String, password: String, role: String) async throws {
        let response = try await APIService.shared.signup(email: email, password: password, role: role)
        token = response.token
        currentUser = response.user
        isAuthenticated = true
        KeychainHelper.save(key: tokenKey, value: response.token)
    }

    func logout() {
        KeychainHelper.delete(key: tokenKey)
        token = nil
        currentUser = nil
        isAuthenticated = false
    }
}
