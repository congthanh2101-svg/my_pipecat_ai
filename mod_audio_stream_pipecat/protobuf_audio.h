/**
 * protobuf_audio.h
 * Protobuf wrapper for Pipecat AudioRawFrame format
 *
 * Based on Python test_ws_client.py implementation
 */

#ifndef PROTOBUF_AUDIO_H
#define PROTOBUF_AUDIO_H

#include <stdint.h>
#include <stdlib.h>
#include <string.h>
#include <vector>

/**
 * Encode integer as protobuf varint
 * Returns number of bytes written
 */
inline size_t encode_varint(uint64_t value, uint8_t *output) {
    size_t len = 0;
    while (value > 127) {
        output[len++] = (value & 0x7f) | 0x80;
        value >>= 7;
    }
    output[len++] = (uint8_t)value;
    return len;
}

/**
 * Build Pipecat AudioRawFrame in protobuf format
 *
 * Protobuf schema (simplified):
 * message Frame {
 *   message AudioRawFrame {
 *     string type = 2;        // "audio"
 *     bytes audio = 3;        // raw PCM data
 *     uint32 sample_rate = 4;
 *     uint32 num_channels = 5;
 *   }
 *   AudioRawFrame frame = 2;
 * }
 *
 * @param audio_data Raw PCM audio bytes
 * @param audio_len Length of audio data
 * @param sample_rate Sample rate (e.g., 16000)
 * @param num_channels Number of channels (1 = mono)
 * @param output Output buffer (must be large enough: audio_len + 50 bytes)
 * @return Length of protobuf frame
 */
inline size_t build_audio_raw_frame(
    const uint8_t *audio_data,
    size_t audio_len,
    uint32_t sample_rate,
    uint32_t num_channels,
    uint8_t *output)
{
    uint8_t *ptr = output;
    uint8_t varint_buf[10];
    size_t varint_len;

    // Build inner AudioRawFrame
    std::vector<uint8_t> inner;

    // Field 2: type = "audio" (tag 0x12 = field 2, wire type 2 = length-delimited)
    const char *type_str = "audio";
    size_t type_len = strlen(type_str);
    inner.push_back(0x12);  // tag for field 2
    varint_len = encode_varint(type_len, varint_buf);
    inner.insert(inner.end(), varint_buf, varint_buf + varint_len);
    inner.insert(inner.end(), type_str, type_str + type_len);

    // Field 3: audio bytes (tag 0x1a = field 3, wire type 2)
    inner.push_back(0x1a);  // tag for field 3
    varint_len = encode_varint(audio_len, varint_buf);
    inner.insert(inner.end(), varint_buf, varint_buf + varint_len);
    inner.insert(inner.end(), audio_data, audio_data + audio_len);

    // Field 4: sample_rate (tag 0x20 = field 4, wire type 0 = varint)
    inner.push_back(0x20);  // tag for field 4
    varint_len = encode_varint(sample_rate, varint_buf);
    inner.insert(inner.end(), varint_buf, varint_buf + varint_len);

    // Field 5: num_channels (tag 0x28 = field 5, wire type 0 = varint)
    inner.push_back(0x28);  // tag for field 5
    varint_len = encode_varint(num_channels, varint_buf);
    inner.insert(inner.end(), varint_buf, varint_buf + varint_len);

    // Wrap in outer Frame (tag 0x12 = field 2, wire type 2)
    *ptr++ = 0x12;
    varint_len = encode_varint(inner.size(), varint_buf);
    memcpy(ptr, varint_buf, varint_len);
    ptr += varint_len;
    memcpy(ptr, inner.data(), inner.size());
    ptr += inner.size();

    return ptr - output;
}

/**
 * Extract audio data from Pipecat OutputAudioRawFrame protobuf
 *
 * Expected format (from Pipecat server):
 * message Frame {
 *   message OutputAudioRawFrame {
 *     bytes audio = 3;        // PCM audio data
 *     uint32 sample_rate = 4;
 *     uint32 num_channels = 5;
 *   }
 *   OutputAudioRawFrame frame = 2;
 * }
 *
 * @param protobuf_data Received protobuf frame
 * @param protobuf_len Length of protobuf data
 * @param audio_out Output buffer for extracted PCM audio
 * @param audio_out_size Size of output buffer
 * @param sample_rate_out Optional: receives the frame's sample_rate (0 if absent)
 * @return Length of extracted audio, or -1 on error
 */
inline int extract_audio_from_protobuf(
    const uint8_t *protobuf_data,
    size_t protobuf_len,
    uint8_t *audio_out,
    size_t audio_out_size,
    uint32_t *sample_rate_out = nullptr)
{
    if (!protobuf_data || protobuf_len < 3 || !audio_out) {
        return -1;
    }
    if (sample_rate_out) {
        *sample_rate_out = 0;
    }

    // Parse outer frame (tag 0x12 = field 2, wire type 2)
    if (protobuf_data[0] != 0x12) {
        return -1;  // Not an OutputAudioRawFrame
    }

    // Decode outer length (varint)
    size_t idx = 1;
    uint32_t outer_len = 0;
    int shift = 0;
    while (idx < protobuf_len) {
        uint8_t b = protobuf_data[idx++];
        outer_len |= (b & 0x7f) << shift;
        if ((b & 0x80) == 0) break;
        shift += 7;
        if (shift >= 35) return -1;  // Invalid varint
    }

    if (idx + outer_len > protobuf_len) {
        return -1;  // Invalid length
    }

    // Parse inner fields
    const uint8_t *inner_data = &protobuf_data[idx];
    size_t inner_len = outer_len;
    size_t inner_idx = 0;

    const uint8_t *audio_data = NULL;
    size_t audio_len = 0;

    while (inner_idx < inner_len) {
        if (inner_idx + 1 > inner_len) break;

        uint8_t tag = inner_data[inner_idx++];
        int field_num = tag >> 3;
        int wire_type = tag & 0x07;

        if (wire_type == 2) {  // Length-delimited (string/bytes)
            // Decode length
            uint32_t field_len = 0;
            shift = 0;
            while (inner_idx < inner_len) {
                uint8_t b = inner_data[inner_idx++];
                field_len |= (b & 0x7f) << shift;
                if ((b & 0x80) == 0) break;
                shift += 7;
                if (shift >= 35) return -1;
            }

            if (inner_idx + field_len > inner_len) {
                return -1;  // Invalid field length
            }

            if (field_num == 3) {  // Field 3 = audio bytes
                audio_data = &inner_data[inner_idx];
                audio_len = field_len;
            }

            inner_idx += field_len;

        } else if (wire_type == 0) {  // Varint (sample_rate=4, num_channels=5)
            uint64_t val = 0;
            int vshift = 0;
            while (inner_idx < inner_len) {
                uint8_t b = inner_data[inner_idx++];
                val |= (uint64_t)(b & 0x7f) << vshift;
                if ((b & 0x80) == 0) break;
                vshift += 7;
            }
            if (field_num == 4 && sample_rate_out) {
                *sample_rate_out = (uint32_t)val;
            }
        } else {
            // Unknown wire type
            return -1;
        }
    }

    // Extract audio if found
    if (audio_data && audio_len > 0) {
        if (audio_len > audio_out_size) {
            return -1;  // Buffer too small
        }
        memcpy(audio_out, audio_data, audio_len);
        return (int)audio_len;
    }

    return -1;  // No audio found
}

// Extract JSON string from protobuf frame (field 4)
// Returns length of JSON string, or -1 if not found
inline int extract_json_from_protobuf(
    const uint8_t *data,
    size_t data_len,
    char *json_out,
    size_t json_out_size)
{
    // Check if this is a field 4 message (JSON/metrics)
    // Field 4, wire type 2 = 0x22
    if (data_len < 10 || data[0] != 0x22) {
        return -1;  // Not a JSON frame
    }

    // Decode outer length
    int idx = 1;
    uint32_t outer_len = 0;
    int shift = 0;
    while (idx < data_len) {
        uint8_t b = data[idx++];
        outer_len |= (b & 0x7f) << shift;
        if ((b & 0x80) == 0) break;
        shift += 7;
    }

    if (idx + outer_len > data_len) {
        return -1;  // Invalid length
    }

    const uint8_t *inner_data = &data[idx];
    size_t inner_len = outer_len;

    // Parse inner fields to find field 1 (JSON string)
    int inner_idx = 0;
    while (inner_idx < inner_len) {
        uint8_t tag = inner_data[inner_idx];
        int field_num = tag >> 3;
        int wire_type = tag & 0x07;
        inner_idx++;

        if (wire_type == 2) {  // Length-delimited (string)
            // Decode length
            uint32_t field_len = 0;
            shift = 0;
            while (inner_idx < inner_len) {
                uint8_t b = inner_data[inner_idx++];
                field_len |= (b & 0x7f) << shift;
                if ((b & 0x80) == 0) break;
                shift += 7;
            }

            if (inner_idx + field_len > inner_len) {
                return -1;  // Invalid field length
            }

            if (field_num == 1) {  // Field 1 = JSON string
                if (field_len >= json_out_size) {
                    return -1;  // Buffer too small
                }
                memcpy(json_out, &inner_data[inner_idx], field_len);
                json_out[field_len] = '\0';  // Null terminate
                return (int)field_len;
            }

            inner_idx += field_len;

        } else if (wire_type == 0) {  // Varint
            while (inner_idx < inner_len) {
                uint8_t b = inner_data[inner_idx++];
                if ((b & 0x80) == 0) break;
            }
        } else {
            return -1;  // Unknown wire type
        }
    }

    return -1;  // No JSON found
}

#endif // PROTOBUF_AUDIO_H
