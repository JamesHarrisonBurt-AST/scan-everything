import Foundation
import ScanAnythingCore

protocol DiscoveryAnalyzing: Sendable {
    func analyze(jpeg: Data, hints: VisionHints) async throws -> DiscoveryAnalysis
    func answer(question: String, context: DialogueContext, history: [DialogueTurn]) async throws -> String
}

enum AnalyzerError: LocalizedError {
    case missingAPIKey
    case invalidURL
    case http(Int, String)
    case emptyResponse
    case transport(String)

    var errorDescription: String? {
        switch self {
        case .missingAPIKey:
            return "Add an API key in Profile to identify objects with AI."
        case .invalidURL:
            return "The AI base URL is not valid."
        case .http(let code, let body):
            if code == 401 || code == 403 {
                return "The API key was rejected. Check it in Profile."
            }
            if code == 429 {
                return "The AI service is rate-limiting requests. Wait a moment and try again."
            }
            return body.isEmpty ? "The AI service returned status \(code)." : "The AI service returned status \(code). \(body)"
        case .emptyResponse:
            return "The AI service returned an empty answer."
        case .transport(let message):
            return message
        }
    }
}

/// OpenAI-compatible chat client. Point `baseURL` at any service that accepts
/// `POST /chat/completions` with an image content part. Implement `DiscoveryAnalyzing`
/// to add a different backend without touching the scanner.
struct OpenAICompatibleAnalyzer: DiscoveryAnalyzing {
    var baseURL: String
    var apiKey: String
    var model: String

    func analyze(jpeg: Data, hints: VisionHints) async throws -> DiscoveryAnalysis {
        let encoded = jpeg.base64EncodedString()
        let dataURL = "data:image/jpeg;base64,\(encoded)"
        let content = try await complete(messages: [
            ChatMessage(role: "user", content: .parts([
                .text(DiscoveryPrompt.text(including: hints)),
                .image(dataURL)
            ]))
        ], maxTokens: 1500, json: true)
        return try AnalysisJSON.decode(from: content)
    }

    func answer(question: String, context: DialogueContext, history: [DialogueTurn]) async throws -> String {
        var messages = [ChatMessage(role: "system", content: .text(DiscoveryPrompt.dialogueSystem(context: context)))]
        for turn in history.suffix(12) {
            messages.append(ChatMessage(role: turn.role, content: .text(turn.content)))
        }
        messages.append(ChatMessage(role: "user", content: .text(question)))
        return try await complete(messages: messages, maxTokens: 400, json: false)
    }

    func validate() async throws {
        let url = try endpoint("models")
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.timeoutInterval = 20
        try authorize(&request)
        let (_, response) = try await send(request)
        try validateHTTP(response, data: Data())
    }

    private func complete(messages: [ChatMessage], maxTokens: Int, json: Bool) async throws -> String {
        let key = apiKey.trimmingCharacters(in: .whitespacesAndNewlines)
        if key.isEmpty { throw AnalyzerError.missingAPIKey }
        let url = try endpoint("chat/completions")
        let body = ChatRequest(model: model.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "gpt-4o-mini" : model, messages: messages, maxTokens: maxTokens, json: json)
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.timeoutInterval = 50
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        try authorize(&request)
        request.httpBody = try JSONEncoder().encode(body)
        let (data, response) = try await send(request)
        try validateHTTP(response, data: data)
        let decoded = try JSONDecoder().decode(ChatResponse.self, from: data)
        let text = decoded.choices.first?.message.content?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        if text.isEmpty { throw AnalyzerError.emptyResponse }
        return text
    }

    private func authorize(_ request: inout URLRequest) throws {
        let key = apiKey.trimmingCharacters(in: .whitespacesAndNewlines)
        if key.isEmpty { throw AnalyzerError.missingAPIKey }
        request.setValue("Bearer \(key)", forHTTPHeaderField: "Authorization")
    }

    private func endpoint(_ path: String) throws -> URL {
        var base = baseURL.trimmingCharacters(in: .whitespacesAndNewlines)
        if base.isEmpty { base = "https://api.openai.com/v1" }
        if base.hasSuffix("/") { base.removeLast() }
        guard let url = URL(string: base + "/" + path) else { throw AnalyzerError.invalidURL }
        return url
    }

    private func send(_ request: URLRequest) async throws -> (Data, URLResponse) {
        do {
            return try await URLSession.shared.data(for: request)
        } catch let error as URLError {
            throw AnalyzerError.transport(error.localizedDescription)
        }
    }

    private func validateHTTP(_ response: URLResponse, data: Data) throws {
        guard let http = response as? HTTPURLResponse else { return }
        guard (200...299).contains(http.statusCode) else {
            let snippet = String(data: data, encoding: .utf8)?
                .replacingOccurrences(of: "\n", with: " ")
                .prefix(180) ?? ""
            throw AnalyzerError.http(http.statusCode, String(snippet))
        }
    }
}

private struct ChatRequest: Encodable {
    var model: String
    var messages: [ChatMessage]
    var maxTokens: Int
    var json: Bool

    enum CodingKeys: String, CodingKey {
        case model
        case messages
        case maxTokens = "max_tokens"
        case responseFormat = "response_format"
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(model, forKey: .model)
        try container.encode(messages, forKey: .messages)
        try container.encode(maxTokens, forKey: .maxTokens)
        if json {
            try container.encode(ResponseFormat(type: "json_object"), forKey: .responseFormat)
        }
    }
}

private struct ResponseFormat: Encodable {
    var type: String
}

private struct ChatMessage: Encodable {
    var role: String
    var content: ChatContent
}

private enum ChatContent: Encodable {
    case text(String)
    case parts([ChatPart])

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .text(let text):
            try container.encode(text)
        case .parts(let parts):
            try container.encode(parts)
        }
    }
}

private enum ChatPart: Encodable {
    case text(String)
    case image(String)

    enum CodingKeys: String, CodingKey {
        case type
        case text
        case imageURL = "image_url"
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        switch self {
        case .text(let text):
            try container.encode("text", forKey: .type)
            try container.encode(text, forKey: .text)
        case .image(let url):
            try container.encode("image_url", forKey: .type)
            try container.encode(ImageURL(url: url), forKey: .imageURL)
        }
    }
}

private struct ImageURL: Encodable {
    var url: String
}

private struct ChatResponse: Decodable {
    struct Choice: Decodable {
        struct Message: Decodable {
            var content: String?
        }
        var message: Message
    }
    var choices: [Choice]
}
