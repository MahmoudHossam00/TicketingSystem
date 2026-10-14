using System;
using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;

public sealed class FlexibleNullableIntConverter : JsonConverter<int?>
{
    public override int? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.Null) return null;

        // number -> int
        if (reader.TokenType == JsonTokenType.Number)
        {
            if (reader.TryGetInt32(out var i)) return i;

            // لو رقم كبير/decimal
            if (reader.TryGetDouble(out var d))
                return (int)Math.Round(d);

            return null;
        }

        // string -> parse int
        if (reader.TokenType == JsonTokenType.String)
        {
            var s = reader.GetString();
            if (string.IsNullOrWhiteSpace(s)) return null;

            // "8" or "8.0"
            if (int.TryParse(s, NumberStyles.Integer, CultureInfo.InvariantCulture, out var i))
                return i;

            if (double.TryParse(s, NumberStyles.Float, CultureInfo.InvariantCulture, out var d))
                return (int)Math.Round(d);

            return null;
        }

        // أي نوع تاني
        return null;
    }

    public override void Write(Utf8JsonWriter writer, int? value, JsonSerializerOptions options)
    {
        if (value.HasValue) writer.WriteNumberValue(value.Value);
        else writer.WriteNullValue();
    }
}
