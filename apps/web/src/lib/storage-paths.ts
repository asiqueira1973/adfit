/**
 * Caminhos de Storage (seções 6.4 e 7.3). `fotos_produto.storage_path` guarda o caminho com o
 * bucket na frente, como no spec: `produtos/<marca_id>/<produto_id>/originais/<arquivo>`.
 * A API de Storage recebe o caminho DENTRO do bucket; estas funções convertem entre os dois.
 */
export const PHOTO_BUCKET = "produtos";

/** Caminho completo (com bucket) da foto original de um produto. */
export function photoStoragePath(marcaId: string, produtoId: string, arquivo: string): string {
  return `${PHOTO_BUCKET}/${marcaId}/${produtoId}/originais/${arquivo}`;
}

/** Remove o prefixo do bucket: "produtos/a/b/originais/x.jpg" → "a/b/originais/x.jpg". */
export function objectPath(storagePath: string, bucket = PHOTO_BUCKET): string {
  return storagePath.startsWith(`${bucket}/`) ? storagePath.slice(bucket.length + 1) : storagePath;
}
