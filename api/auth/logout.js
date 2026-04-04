import { withApi } from '../../src/lib/http.js'

export default withApi({ methods: ['POST'], roles: ['hospital', 'staff', 'volunteer', 'family'] }, async () => ({
  message: 'Logout exitoso. En JWT stateless, el cliente debe descartar el token.',
}))
