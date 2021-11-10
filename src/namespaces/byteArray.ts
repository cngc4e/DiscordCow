import jsesc from "jsesc";

export class ByteArray {
	buffer: Buffer;
	writePosition: number;
	readPosition: number;

	/**
	 * Constructor.
	 *
	 * @example
	 * ```js
	 * const packet = new ByteArray();
	 * ```
	 */
	constructor(buff?: Buffer | number[]) {
		this.buffer = Buffer.isBuffer(buff)
			? buff
			: Array.isArray(buff)
				? Buffer.from(buff)
				: Buffer.alloc(0);
		this.writePosition = this.buffer.length;
		this.readPosition = 0;
	}

	get length() {
		return this.buffer.length;
	}

	get [Symbol.toStringTag]() {
		return "ByteArray";
	}

	get bytesAvailable() {
		return this.length - this.readPosition;
	}

	/**
	 * Expands the buffer
	 */
	expand(value: number) {
		if (this.length - this.writePosition < value) {
			this.buffer = Buffer.concat([
				this.buffer,
				Buffer.alloc(value - (this.length - this.writePosition)),
			]);
		}
	}

	/**
	 * Adds data to the buffer.
	 */
	write(data: Buffer | string | SharedArrayBuffer | ByteArray) {
		let buffer;
		if (Buffer.isBuffer(data)) buffer = data;
		else if (Array.isArray(data) || typeof data === "string" || data instanceof String)
			buffer = Buffer.from(data);
		else if (data instanceof ByteArray) buffer = Buffer.from(data.buffer);
		else throw new Error("The value type must be buffer, bytearray, string or array");
		this.buffer = Buffer.concat([this.buffer, buffer]);
		this.writePosition += buffer.length;
		return this;
	}

	/**
	 * Clears the contents of the bytearray and resets the length and positions properties to 0.
	 */
	clear() {
		this.buffer = Buffer.alloc(0);
		this.writePosition = 0;
		this.readPosition = 0;
	}

	/**
	 * Reads a Boolean value from the byte stream.
	 */
	readBoolean() {
		return this.readByte() !== 0;
	}

	/**
	 * Reads a signed byte from the byte stream.
	 */
	readByte() {
		return this.buffer.readInt8(this.readPosition++);
	}

	/**
	 * Reads a buffer of bytes, specified by the length parameter, from the byte stream.
	 */
	readBufBytes(length: number) {
		const value = this.buffer.subarray(this.readPosition, this.readPosition + length);
		this.readPosition += length;
		return value;
	}

	/**
	 * Reads a signed 32-bit integer from the byte stream.
	 */
	readInt() {
		const value = this.buffer.readInt32BE(this.readPosition);
		this.readPosition += 4;
		return value;
	}

	/**
	 * Reads a signed 16-bit integer from the byte stream.
	 */
	readShort() {
		const value = this.buffer.readInt16BE(this.readPosition);
		this.readPosition += 2;
		return value;
	}

	/**
	 * Reads an unsigned byte from the byte stream.
	 */
	readUnsignedByte() {
		return this.buffer.readUInt8(this.readPosition++);
	}

	/**
	 * Reads an unsigned 32-bit integer from the byte stream.
	 */
	readUnsignedInt() {
		const value = this.buffer.readUInt32BE(this.readPosition);
		this.readPosition += 4;
		return value;
	}

	/**
	 * Reads an unsigned 16-bit integer from the byte stream.
	 */
	readUnsignedShort() {
		const value = this.buffer.readUInt16BE(this.readPosition);
		this.readPosition += 2;
		return value;
	}

	/**
	 * Reads a UTF-8 string from the byte stream.
	 */
	readUTF() {
		const size = this.readUnsignedShort();
		const value = this.buffer.subarray(this.readPosition, this.readPosition + size).toString();
		this.readPosition += size;
		return value;
	}

	toJSON() {
		return Object.assign({}, this.buffer.toJSON().data);
	}

	/**
	 * Converts the byte array to a string representation.
	 */
	toString(encoding: BufferEncoding | "printable" = "printable") {
		if (encoding == "printable") {
			return jsesc(this.buffer.toString());
		}
		return this.buffer.toString(encoding);
	}

	/**
	 * Writes a Boolean value.
	 */
	writeBoolean(value: boolean) {
		return this.writeByte(value ? 1 : 0);
	}

	/**
	 * Writes a byte to the byte stream.
	 */
	writeByte(value: number) {
		this.expand(1);
		this.buffer.writeInt8(value, this.writePosition++);
		return this;
	}

	/**
	 * Writes a sequence of length bytes from the specified byte array, bytes, starting offset bytes into the byte stream.
	 */
	writeBytes(bytes: ByteArray, offset = 0, length = 0) {
		if (length === 0) length = bytes.length - offset;
		this.write(bytes.buffer.subarray(offset, offset + length));
		return this;
	}

	/**
	 * Writes a sequence of bytes from the specified buffer into the byte stream.
	 */
	writeBufBytes(data: Buffer) {
		return this.write(data);
	}

	/**
	 * Writes a 32-bit signed integer to the byte stream.
	 */
	writeInt(value: number) {
		this.expand(4);
		this.buffer.writeInt32BE(value, this.writePosition);
		this.writePosition += 4;
		return this;
	}

	/**
	 * Writes a 16-bit integer to the byte stream.
	 */
	writeShort(value: number) {
		this.expand(2);
		this.buffer.writeInt16BE(value, this.writePosition);
		this.writePosition += 2;
		return this;
	}

	/**
	 * Writes a unsigned byte to the byte stream.
	 */
	writeUnsignedByte(value: number) {
		this.expand(1);
		this.buffer.writeUInt8(value, this.writePosition++);
		return this;
	}

	/**
	 * Writes a 32-bit unsigned integer to the byte stream.
	 */
	writeUnsignedInt(value: number) {
		this.expand(4);
		this.buffer.writeUInt32BE(value, this.writePosition);
		this.writePosition += 4;
		return this;
	}

	/**
	 * Writes a 16-bit unsigned integer to the byte stream.
	 */
	writeUnsignedShort(value: number) {
		this.expand(2);
		this.buffer.writeUInt16BE(value, this.writePosition);
		this.writePosition += 2;
		return this;
	}

	/**
	 * Writes a UTF-8 string to the byte stream.
	 */
	writeUTF(value: string) {
		const size = Buffer.byteLength(value);
		this.writeUnsignedShort(size);
		this.write(Buffer.from(value, "utf8"));
		return this;
	}
}
