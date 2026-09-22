import assert from "node:assert/strict";
import test from "node:test";
import {
  attWriteSize,
  crc16CcittFalse,
  encodeNotify,
  NotifyReassembler,
  planWrites,
} from "../src/index.js";

test("default ATT MTU leaves 20 bytes for the write", () => {
  assert.equal(attWriteSize(), 20);
  assert.equal(attWriteSize(247), 244);
  assert.throws(() => attWriteSize(22), /MTU/);
});

test("firmware is split on the negotiated write size", () => {
  const firmware = new Uint8Array(50).map((_, index) => index);
  const chunks = planWrites(firmware, { mtu: 23 });
  assert.deepEqual(chunks.map((chunk) => chunk.length), [20, 20, 10]);
  assert.equal(chunks[0][19], 19);
  assert.equal(chunks[2][0], 40);
});

test("CRC-16/CCITT-FALSE matches the standard check value", () => {
  assert.equal(crc16CcittFalse("123456789"), 0x29b1);
});

test("notifications reassemble across fragments", () => {
  const body = new TextEncoder().encode("ota-image");
  const first = encodeNotify(body.slice(0, 4), false);
  const last = encodeNotify(body.slice(4), true);
  const rx = new NotifyReassembler();
  assert.equal(rx.push(first), null);
  const done = rx.push(last);
  assert.equal(new TextDecoder().decode(done), "ota-image");
  assert.throws(() => rx.push(last), /finished/);
});
