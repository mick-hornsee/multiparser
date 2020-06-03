import * as bytes from "../std/bytes/mod.ts";
import { BufReader } from "../std/io/bufio.ts";
import { TextProtoReader } from "../std/textproto/mod.ts";
import { RawField, Options } from "./types.ts";
import { MultiParserError } from "./error.ts";

export const encoder = new TextEncoder();

export async function getRawFields(
  reader: Deno.Reader,
  headerBoundary: Uint8Array,
  opt: Options,
): Promise<RawField[]> {
  // boundary
  const boundaryByte = bytes.concat(encoder.encode("--"), headerBoundary);
  // \r\n--boundary
  const beginBoundaryByte = bytes.concat(
    encoder.encode("\r\n--"),
    headerBoundary,
  );
  // --boundary--
  const endBoundaryByte = bytes.concat(boundaryByte, encoder.encode("--"));

  const bufReader = new BufReader(reader);

  let lineByte = await bufReader.readLine();
  let rawFields: RawField[] = [];
  // line exists and line !== endBoundary
  while (lineByte && !bytes.equal(lineByte.line, endBoundaryByte)) {
    if (bytes.equal(lineByte.line, boundaryByte)) {
      let headers = await getFieldHeader(bufReader);
      let data = await getFieldData(bufReader, beginBoundaryByte, opt);
      // skip \r\n
      bufReader.read(new Uint8Array(2));
      rawFields.push({ headers, data });
      // return single file
      if (!opt.multiple) {
        return rawFields;
      }
    }

    lineByte = await bufReader.readLine();
  }
  return rawFields;
}

async function getFieldHeader(bufReader: BufReader): Promise<Headers | null> {
  const headerReader = new TextProtoReader(bufReader);
  const header = await headerReader.readMIMEHeader();
  return header;
}

async function getFieldData(
  bufReader: BufReader,
  boundary: Uint8Array,
  opt: Options,
): Promise<Uint8Array> {
  let restPart = await bufReader.peek(opt.maxFieldSize! + boundary.byteLength);
  // TODO: findIndex() may return -1, because bufReader haven't read to the end
  let fieldBodyLength = bytes.findIndex(restPart!, boundary);
  if (fieldBodyLength >= 0) {
    // track maxFileSize
    opt.maxFileSize = opt.maxFileSize! - fieldBodyLength;
    if (opt.maxFieldSize! < 0) {
      throw new MultiParserError(
        "total file size is larger than the limit " + opt.maxFileSize + "bytes",
      );
    }
    let fieldDataBytes = new Uint8Array(fieldBodyLength);
    // read exact fieldBodyLength bytes into fieldDataBuf
    bufReader.read(fieldDataBytes);
    return fieldDataBytes;
  } else {
    // couldn't find data in given maxFieldSize
    throw new MultiParserError(
      "field is larger than the limit: " + opt.maxFieldSize + "bytes",
    );
  }
}
