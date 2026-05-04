import SwiftUI
import PhotosUI

struct CreatePostView: View {
    @EnvironmentObject var auth: AuthManager
    @Environment(\.dismiss) var dismiss

    @State private var text = ""
    @State private var selectedItem: PhotosPickerItem? = nil
    @State private var selectedImageData: Data? = nil
    @State private var selectedImageUrl: String? = nil
    @State private var isReel = false
    @State private var isStory = false
    @State private var isUploading = false
    @State private var isPosting = false
    @State private var error: String?

    var canPost: Bool {
        !text.trimmingCharacters(in: .whitespaces).isEmpty || selectedImageData != nil
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.spotrBlack.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 20) {
                        // Author row
                        HStack(spacing: 10) {
                            AvatarView(
                                url: auth.currentUser?.avatarUrl,
                                name: auth.currentUser?.displayName ?? "You",
                                size: 40
                            )
                            Text(auth.currentUser?.displayName ?? "")
                                .font(.spotrHeadline)
                                .foregroundColor(.white)
                            Spacer()
                        }
                        .padding(.horizontal, 16)
                        .padding(.top, 8)

                        // Text input
                        ZStack(alignment: .topLeading) {
                            if text.isEmpty {
                                Text("What's happening?")
                                    .font(.spotrBody)
                                    .foregroundColor(.spotrMuted)
                                    .padding(.horizontal, 16)
                                    .padding(.top, 4)
                            }
                            TextEditor(text: $text)
                                .font(.spotrBody)
                                .foregroundColor(.white)
                                .scrollContentBackground(.hidden)
                                .background(Color.clear)
                                .frame(minHeight: 100)
                                .padding(.horizontal, 12)
                        }

                        // Image preview
                        if let data = selectedImageData, let uiImg = UIImage(data: data) {
                            ZStack(alignment: .topTrailing) {
                                Image(uiImage: uiImg)
                                    .resizable()
                                    .scaledToFit()
                                    .frame(maxWidth: .infinity)
                                    .frame(maxHeight: 280)
                                    .cornerRadius(10)
                                    .padding(.horizontal, 16)

                                Button(action: { selectedItem = nil; selectedImageData = nil; selectedImageUrl = nil }) {
                                    Image(systemName: "xmark.circle.fill")
                                        .foregroundColor(.white)
                                        .font(.system(size: 22))
                                        .shadow(radius: 4)
                                }
                                .padding(.top, 6)
                                .padding(.trailing, 22)
                            }
                        }

                        // Upload loading
                        if isUploading {
                            HStack(spacing: 8) {
                                ProgressView().tint(.spotrGreen)
                                Text("Uploading photo…")
                                    .font(.spotrCaption)
                                    .foregroundColor(.spotrMuted)
                            }
                        }

                        // Toggles
                        VStack(spacing: 0) {
                            Divider().background(Color.spotrBorder)
                            Toggle("Post as Reel", isOn: $isReel)
                                .font(.spotrBody)
                                .foregroundColor(.white)
                                .tint(.spotrGreen)
                                .padding(.horizontal, 16)
                                .padding(.vertical, 12)
                                .onChange(of: isReel) { if $0 { isStory = false } }
                            Divider().background(Color.spotrBorder)
                            Toggle("Post as Story", isOn: $isStory)
                                .font(.spotrBody)
                                .foregroundColor(.white)
                                .tint(.spotrGreen)
                                .padding(.horizontal, 16)
                                .padding(.vertical, 12)
                                .onChange(of: isStory) { if $0 { isReel = false } }
                            Divider().background(Color.spotrBorder)
                        }

                        if let error {
                            Text(error)
                                .font(.spotrCaption)
                                .foregroundColor(.red)
                                .padding(.horizontal, 16)
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
                    Text("New Post")
                        .font(.spotrHeadline)
                        .foregroundColor(.white)
                }
                ToolbarItem(placement: .primaryAction) {
                    Button(action: post) {
                        if isPosting {
                            ProgressView().tint(.black)
                                .frame(width: 60, height: 32)
                        } else {
                            Text("Post")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundColor(.black)
                                .frame(width: 60, height: 32)
                                .background(canPost ? Color.spotrGreen : Color.spotrGreen.opacity(0.4))
                                .cornerRadius(8)
                        }
                    }
                    .disabled(!canPost || isPosting || isUploading)
                }
                ToolbarItem(placement: .bottomBar) {
                    HStack {
                        PhotosPicker(selection: $selectedItem, matching: .images) {
                            HStack(spacing: 6) {
                                Image(systemName: "photo")
                                    .foregroundColor(.spotrGreen)
                                Text("Photo")
                                    .font(.spotrBody)
                                    .foregroundColor(.spotrGreen)
                            }
                        }
                        Spacer()
                    }
                }
            }
            .onChange(of: selectedItem) { item in
                guard let item else { return }
                Task { await loadPhoto(item: item) }
            }
        }
    }

    private func loadPhoto(item: PhotosPickerItem) async {
        isUploading = true
        error = nil
        do {
            if let data = try await item.loadTransferable(type: Data.self) {
                selectedImageData = data
                let url = try await APIService.shared.uploadImage(data: data, token: auth.token ?? "")
                selectedImageUrl = url
            }
        } catch {
            self.error = "Photo upload failed"
            selectedImageData = nil
        }
        isUploading = false
    }

    private func post() {
        isPosting = true
        error = nil
        Task {
            do {
                _ = try await APIService.shared.createPost(
                    text: text.trimmingCharacters(in: .whitespacesAndNewlines),
                    mediaUrl: selectedImageUrl,
                    mediaType: selectedImageUrl != nil ? "image" : nil,
                    isReel: isReel,
                    isStory: isStory,
                    token: auth.token ?? ""
                )
                dismiss()
            } catch {
                self.error = error.localizedDescription
            }
            isPosting = false
        }
    }
}
