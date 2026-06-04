/* global chrome */
const isDev = !chrome?.runtime?.getManifest || window.location.hostname === 'localhost'

export const API_URL = isDev
  ? 'http://localhost:3000'
  : 'https://bitsoadaptador-backend.onrender.com'