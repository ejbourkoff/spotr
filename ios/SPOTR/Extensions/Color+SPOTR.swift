import SwiftUI

extension Color {
    static let spotrGreen = Color(hex: "#00E639")
    static let spotrBlack = Color(hex: "#0A0A0A")
    static let spotrDark = Color(hex: "#111111")
    static let spotrCard = Color(hex: "#1A1A1A")
    static let spotrBorder = Color(hex: "#2A2A2A")
    static let spotrMuted = Color(hex: "#8E8E93")

    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let r, g, b: Double
        switch hex.count {
        case 6:
            r = Double((int >> 16) & 0xFF) / 255
            g = Double((int >> 8) & 0xFF) / 255
            b = Double(int & 0xFF) / 255
        default:
            r = 1; g = 1; b = 1
        }
        self.init(red: r, green: g, blue: b)
    }
}

extension Font {
    static let spotrTitle = Font.system(size: 22, weight: .bold, design: .default)
    static let spotrHeadline = Font.system(size: 16, weight: .semibold)
    static let spotrBody = Font.system(size: 14, weight: .regular)
    static let spotrCaption = Font.system(size: 12, weight: .regular)
}
