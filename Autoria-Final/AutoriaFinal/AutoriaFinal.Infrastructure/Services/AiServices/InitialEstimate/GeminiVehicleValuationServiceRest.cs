using AutoriaFinal.Contract.Dtos.Ai.InitialEstimate;
using AutoriaFinal.Domain.Entities.Ai.InitialEstimate;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Threading;
using System.Globalization;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace AutoriaFinal.Infrastructure.Services.AiServices.InitialEstimate
{
    public class GeminiVehicleValuationServiceRest
    {
        private readonly RestGeminiClient _client;
        private readonly ILogger<GeminiVehicleValuationServiceRest> _logger;
        private readonly JsonSerializerOptions _jsonOptions = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
        private static readonly Regex CodeFenceRegex = new Regex(@"^```(?:json)?\s*|```$", RegexOptions.Singleline | RegexOptions.Compiled);
        private static readonly Regex NumberPattern = new Regex(@"-?\d+(\.\d+)?", RegexOptions.Compiled);

        public GeminiVehicleValuationServiceRest(RestGeminiClient client, ILogger<GeminiVehicleValuationServiceRest> logger)
        {
            _client = client ?? throw new ArgumentNullException(nameof(client));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public async Task<VehiclePriceEstimate?> GetEstimateAsync(VehicleDetailsDto dto, decimal? askingPrice = null, CancellationToken ct = default)
        {
            if (dto == null) throw new ArgumentNullException(nameof(dto));

            var prompt = BuildPriceEstimatePrompt(dto, askingPrice);

            JsonDocument doc;
            try
            {
                doc = await _client.GenerateContentAsync(prompt, ct).ConfigureAwait(false);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Generative API failed for vehicle {Make} {Model} {Year}", dto.Make, dto.Model, dto.Year);
                throw;
            }

            try
            {
                // Try common output shapes from generative language responses
                // 1) top-level "candidates" -> [ { "content": { "parts": [ { "text": "..." } ] } } ]
                // 2) top-level "candidates" -> [ { "content": { "text": "..." } } ]
                // 3) top-level "output" or "predictions" or direct JSON string
                string candidateText = TryExtractGeneratedText(doc);

                candidateText = CodeFenceRegex.Replace(candidateText ?? "", "").Trim();

                if (string.IsNullOrWhiteSpace(candidateText))
                {
                    _logger.LogWarning("No textual candidate in Generative response for vehicle {Make} {Model} {Year}", dto.Make, dto.Model, dto.Year);
                    return null;
                }

                // Try parse as JSON directly
                try
                {
                    var estimate = JsonSerializer.Deserialize<VehiclePriceEstimate>(candidateText, _jsonOptions);
                    if (estimate != null) return PostProcessEstimate(estimate);
                }
                catch (JsonException)
                {
                    // fall through to heuristics
                }

                // Try to extract numbers heuristically
                var fallback = TryExtractEstimateFromText(candidateText);
                if (fallback != null) return PostProcessEstimate(fallback);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to parse Generative response for vehicle {Make} {Model}", dto.Make, dto.Model);
            }

            _logger.LogWarning("Could not parse estimate for vehicle {Make} {Model} from generative response", dto.Make, dto.Model);
            return null;
        }

        private string TryExtractGeneratedText(JsonDocument doc)
        {
            var root = doc.RootElement;

            // 1) candidates path
            if (root.TryGetProperty("candidates", out var candidates) && candidates.ValueKind == JsonValueKind.Array && candidates.GetArrayLength() > 0)
            {
                var first = candidates[0];

                // path: candidates[0].content.parts[0].text
                if (first.TryGetProperty("content", out var content) && content.TryGetProperty("parts", out var parts) && parts.ValueKind == JsonValueKind.Array && parts.GetArrayLength() > 0)
                {
                    var p = parts[0];
                    if (p.ValueKind == JsonValueKind.Object && p.TryGetProperty("text", out var t) && t.ValueKind == JsonValueKind.String) return t.GetString() ?? "";
                }

                // path: candidates[0].content.text
                if (first.TryGetProperty("content", out content) && content.ValueKind == JsonValueKind.Object && content.TryGetProperty("text", out var t2) && t2.ValueKind == JsonValueKind.String) return t2.GetString() ?? "";

                // path: candidates[0].text
                if (first.TryGetProperty("text", out var t3) && t3.ValueKind == JsonValueKind.String) return t3.GetString() ?? "";

                // fallback stringify
                return first.ToString();
            }

            // 2) output array (some responses)
            if (root.TryGetProperty("output", out var output) && output.ValueKind == JsonValueKind.Array && output.GetArrayLength() > 0)
            {
                var firstOut = output[0];
                if (firstOut.ValueKind == JsonValueKind.Object && firstOut.TryGetProperty("content", out var cc) && cc.ValueKind == JsonValueKind.Array && cc.GetArrayLength() > 0)
                {
                    var part = cc[0];
                    if (part.ValueKind == JsonValueKind.Object && part.TryGetProperty("text", out var t) && t.ValueKind == JsonValueKind.String) return t.GetString() ?? "";
                }
                return firstOut.ToString();
            }

            // 3) predictions (Vertex-like) -> predictions[0]...
            if (root.TryGetProperty("predictions", out var preds) && preds.ValueKind == JsonValueKind.Array && preds.GetArrayLength() > 0)
            {
                // reuse prior extraction helper from previously uploaded code concept
                var first = preds[0];
                // try common text fields
                if (first.ValueKind == JsonValueKind.String) return first.GetString() ?? "";
                if (first.TryGetProperty("content", out var cc2) && cc2.ValueKind == JsonValueKind.String) return cc2.GetString() ?? "";
                return first.ToString();
            }

            // 4) else return root.ToString()
            return root.ToString();
        }

        private static VehiclePriceEstimate PostProcessEstimate(VehiclePriceEstimate estimate)
        {
            if (estimate.MinPrice > estimate.MaxPrice)
            {
                var t = estimate.MinPrice;
                estimate.MinPrice = estimate.MaxPrice;
                estimate.MaxPrice = t;
            }
            estimate.EstimatedAveragePrice = Math.Clamp(estimate.EstimatedAveragePrice, estimate.MinPrice, estimate.MaxPrice);
            return estimate;
        }

        private static VehiclePriceEstimate TryExtractEstimateFromText(string text)
        {
            if (string.IsNullOrWhiteSpace(text)) return null!;

            var matches = NumberPattern.Matches(text)
                .Select(m => decimal.TryParse(m.Value, NumberStyles.Any, CultureInfo.InvariantCulture, out var d) ? d : (decimal?)null)
                .Where(x => x.HasValue)
                .Select(x => x!.Value)
                .ToList();

            if (matches.Count == 0) return null;

            var min = matches.Min();
            var max = matches.Max();
            decimal avg;
            if (matches.Count == 1) avg = matches[0];
            else if (matches.Count == 2) avg = (matches[0] + matches[1]) / 2;
            else avg = matches[matches.Count / 2];

            return new VehiclePriceEstimate
            {
                EstimatedAveragePrice = avg,
                MinPrice = min,
                MaxPrice = max,
                Currency = "UNKNOWN",
                AnalysisSummary = "Fallback numeric extraction from model's free text output."
            };
        }

        private string BuildPriceEstimatePrompt(VehicleDetailsDto dto, decimal? askingPrice)
        {
            var asking = askingPrice.HasValue ? askingPrice.Value.ToString(CultureInfo.InvariantCulture) : "null";
            return $@"
Return ONLY a JSON object following this schema:

{{
  ""estimatedAveragePrice"": <number>,
  ""currency"": ""<string>"",
  ""minPrice"": <number>,
  ""maxPrice"": <number>,
  ""confidenceScore"": <number>,
  ""analysisSummary"": ""<string>""
}}

Provide numbers using '.' as decimal separator, do not include thousand separators, and return only the JSON object (no explanation, no markdown code fences).

Vehicle:
- make: {dto.Make}
- model: {dto.Model}
- year: {dto.Year}
- mileage: {dto.Mileage}
- region: {dto.Region ?? "unknown"}
- condition: {Sanitize(dto.ConditionDescription)}
- damage: {Sanitize(dto.DamageDescription)}
- askingPrice: {asking}
";
        }

        private static string Sanitize(string? s)
        {
            if (string.IsNullOrWhiteSpace(s)) return "none";
            return s!.Replace("\r", " ").Replace("\n", " ").Trim();
        }
    }
}
