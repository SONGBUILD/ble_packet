/** BLE byte planning. No radio, no vendor command table. */

export function attWriteSize(mtu = 23) {
  if (!Number.isInteger(mtu) || mtu < 23) {
    throw new Error("ATT MTU must be an integer >= 23");
  }
  return mtu - 3;
}

export function planWrites(payload, options = {}) {
  const bytes = toBytes(payload);
  const size = attWriteSize(options.mtu ?? 23);
  const chunks = [];
  for (let offset = 0; offset < bytes.length; offset += size) {
    chunks.push(bytes.slice(offset, offset + size));
  }
  return chunks;
}

/** CRC-16/CCITT-FALSE. "123456789" is 0x29b1. */
export function crc16CcittFalse(payload) {
  let crc = 0xffff;
  for (const byte of toBytes(payload)) {
    crc ^= byte << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc;
}

/**
 * Notification framing used by this library:
 * byte 0 bit 0 = 1 means this fragment is the last one.
 * The remaining bytes are payload.
 */
export function encodeNotify(payload, last) {
  const bytes = toBytes(payload);
  const frame = new Uint8Array(bytes.length + 1);
  frame[0] = last ? 1 : 0;
  frame.set(bytes, 1);
  return frame;
}

export class NotifyReassembler {
  constructor() {
    this.parts = [];
    this.done = false;
  }

  push(frame) {
    const bytes = toBytes(frame);
    if (bytes.length === 0) throw new Error("empty notification");
    if (this.done) throw new Error("transfer already finished");
    this.parts.push(bytes.slice(1));
    this.done = (bytes[0] & 0x01) === 1;
    return this.done ? this.payload() : null;
  }

  payload() {
    const total = this.parts.reduce((sum, part) => sum + part.length, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    for (const part of this.parts) {
      out.set(part, offset);
      offset += part.length;
    }
    return out;
  }
}

function toBytes(value) {
  if (value instanceof Uint8Array) return value;
  if (typeof value === "string") return new TextEncoder().encode(value);
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  throw new Error("payload must be bytes or a string");
}
