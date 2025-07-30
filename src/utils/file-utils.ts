export async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return await file.arrayBuffer()
}

export async function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Remove the data URL prefix
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export async function readFileAsText(file: File): Promise<string> {
  return await file.text()
}

export async function readFileAsBinaryString(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsBinaryString(file)
  })
}

export function createBlobFromArrayBuffer(buffer: ArrayBuffer, type: string): Blob {
  return new Blob([buffer], { type })
}

export function createFileFromArrayBuffer(
  buffer: ArrayBuffer, 
  filename: string, 
  type: string
): File {
  return new File([buffer], filename, { type })
}
