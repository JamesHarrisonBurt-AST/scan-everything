import Foundation

/// Turns a scanner payload into a GTIN that a product catalog can look up.
///
/// QR codes, URLs, and other non-product symbols stay nil unless they carry a
/// GS1 Digital Link or an `(01)` element. That keeps ticket numbers and web
/// links from being sent to a catalog.
public enum BarcodeIdentity {
    public static func gtin(from payload: String, symbology: String? = nil) -> String? {
        let trimmed = payload.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return nil }
        if let linked = digitalLinkGTIN(trimmed) { return linked }
        if let element = elementStringGTIN(trimmed) { return element }
        if isMatrix(symbology) { return nil }
        if trimmed.contains(where: { $0.isLetter }) { return nil }
        let digits = trimmed.filter(\.isNumber)
        return normalize(digits, symbology: symbology)
    }

    static func normalize(_ digits: String, symbology: String?) -> String? {
        switch digits.count {
        case 14, 13:
            return isValid(digits) ? digits : nil
        case 12:
            let ean = "0" + digits
            return isValid(ean) ? ean : nil
        case 8:
            if isUPCE(symbology) { return expandUPCE(digits) }
            if isValid(digits) { return digits }
            return expandUPCE(digits)
        case 6:
            return isUPCE(symbology) ? expandUPCE(digits) : nil
        default:
            return nil
        }
    }

    static func isValid(_ code: String) -> Bool {
        guard code.count >= 8, code.allSatisfy(\.isNumber) else { return false }
        return checkDigit(String(code.dropLast())) == code.last
    }

    static func checkDigit(_ data: String) -> Character {
        var sum = 0
        for (offset, character) in data.reversed().enumerated() {
            guard let digit = character.wholeNumberValue else { return "?" }
            sum += digit * (offset % 2 == 0 ? 3 : 1)
        }
        let check = (10 - (sum % 10)) % 10
        return Character(String(check))
    }

    /// Expands UPC-E (6 or 8 digits) to a 13-digit GTIN. An 8-digit code whose
    /// check digit does not match the expansion is rejected.
    static func expandUPCE(_ digits: String) -> String? {
        let characters = Array(digits)
        let numberSystem: Character
        let body: [Character]
        let givenCheck: Character?
        if characters.count == 8 {
            numberSystem = characters[0]
            guard numberSystem == "0" || numberSystem == "1" else { return nil }
            body = Array(characters[1...6])
            givenCheck = characters[7]
        } else if characters.count == 6 {
            numberSystem = "0"
            body = characters
            givenCheck = nil
        } else {
            return nil
        }

        let manufacturer: String
        let product: String
        switch body[5] {
        case "0", "1", "2":
            manufacturer = "\(body[0])\(body[1])\(body[5])00"
            product = "00\(body[2])\(body[3])\(body[4])"
        case "3":
            manufacturer = "\(body[0])\(body[1])\(body[2])00"
            product = "000\(body[3])\(body[4])"
        case "4":
            manufacturer = "\(body[0])\(body[1])\(body[2])\(body[3])0"
            product = "0000\(body[4])"
        default:
            manufacturer = "\(body[0])\(body[1])\(body[2])\(body[3])\(body[4])"
            product = "0000\(body[5])"
        }
        let data = "\(numberSystem)\(manufacturer)\(product)"
        guard data.count == 11 else { return nil }
        let check = checkDigit(data)
        if let givenCheck, givenCheck != check { return nil }
        return "0" + data + String(check)
    }

    private static func isUPCE(_ symbology: String?) -> Bool {
        let value = (symbology ?? "").lowercased().replacingOccurrences(of: "-", with: "").replacingOccurrences(of: "_", with: "")
        return value.contains("upce")
    }

    private static func isMatrix(_ symbology: String?) -> Bool {
        let value = (symbology ?? "").lowercased().replacingOccurrences(of: "-", with: "").replacingOccurrences(of: "_", with: "")
        return ["qr", "aztec", "datamatrix", "pdf417"].contains { value.contains($0) }
    }

    private static func digitalLinkGTIN(_ payload: String) -> String? {
        guard payload.contains("://") else { return nil }
        guard let regex = try? NSRegularExpression(pattern: "/01/(\\d{8,14})") else { return nil }
        let range = NSRange(payload.startIndex..., in: payload)
        guard let match = regex.firstMatch(in: payload, range: range), match.numberOfRanges > 1,
              let digitRange = Range(match.range(at: 1), in: payload) else { return nil }
        return normalize(String(payload[digitRange]), symbology: nil)
    }

    private static func elementStringGTIN(_ payload: String) -> String? {
        let compact = payload.replacingOccurrences(of: " ", with: "")
        if let regex = try? NSRegularExpression(pattern: #"\(01\)(\d{14})"#) {
            let range = NSRange(compact.startIndex..., in: compact)
            if let match = regex.firstMatch(in: compact, range: range), match.numberOfRanges > 1,
               let digitRange = Range(match.range(at: 1), in: compact) {
                let digits = String(compact[digitRange])
                return isValid(digits) ? digits : nil
            }
        }
        let digits = compact.filter(\.isNumber)
        guard compact.hasPrefix("01") || compact.hasPrefix("(01)"), digits.count == 16 else { return nil }
        let gtin = String(digits.dropFirst(2))
        return isValid(gtin) ? gtin : nil
    }
}
