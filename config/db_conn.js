const { Pool } = require('pg');
require('dotenv').config(); // To load environment variables from the .env file

// ✅ Aiven CA certificate (trust chain)
const AIVEN_CA = `-----BEGIN CERTIFICATE-----
MIIEUDCCArigAwIBAgIUHcuP1WKWtpkTGSvDwhU1RZUU9DUwDQYJKoZIhvcNAQEM
BQAwQDE+MDwGA1UEAww1MzViYTQxMTctYjY1Yy00Mzk3LWFkY2UtYmVkNDQyYTFj
ZGRiIEdFTiAxIFByb2plY3QgQ0EwHhcNMjUxMTI4MDUxNzQxWhcNMzUxMTI2MDUx
NzQxWjBAMT4wPAYDVQQDDDUzNWJhNDExNy1iNjVjLTQzOTctYWRjZS1iZWQ0NDJh
MWNkZGIgR0VOIDEgUHJvamVjdCBDQTCCAaIwDQYJKoZIhvcNAQEBBQADggGPADCC
AYoCggGBAMf9NljWa5iIiw27z1T+XEuq0DeH3UJGpwX1466lzOLHpfm2wKgme7X2
h1Fnel2zxn3Y2i2hTTW1Qoz5RhaadZ5B2ykskkWKMQ8tO6gGI53C/PpFp0Huiwda
kKe/i8P2NyIBS/cu7XonUolY7T58wIMatDdfJTtS8rpskFQXPPCwMoCXF3UTvUrM
PV+uqHcKv/k2WzTh274AdpCdX6Z/rP5YFEYLPQfpLdLsFL1/n6EczqatA58OE4Gl
WucSX4jYjHVP6q98tcu2kabq6QpnpkFSeMpQS3MCZ/17LLgG26kCmMH63t+nGlAH
5g4owWBYOQIRfZ5s7eomPwxOKraL+OJUK4g6On3LLEioXJ5vZ1ICtozDfR5kXawr
L5XBPyN48xmiReJ+nVuzRDST++C3ZRXZ7RZ/dbqn/8Lgo6hOqBg1SgzxvobSg/Ae
L/iqgIkXUdDrT+CvVFRvmRzSn5DCeNvngJrMjMSnjHT0Zc2QVmXUnOhe5oXRWaLP
7ciD6JENMwIDAQABo0IwQDAdBgNVHQ4EFgQUhieiJ45xS9Vos/HbeLrGqShRddow
EgYDVR0TAQH/BAgwBgEB/wIBADALBgNVHQ8EBAMCAQYwDQYJKoZIhvcNAQEMBQAD
ggGBAJIrs9G37jwxivQRHK68hntVhyN/LRXEQuWwR688i4Vjrbew7IMb4LE0Z5sL
39ah3CH8muWIx5zHmlbuif8b8x5E7XbSEXQLEKobGcY4WypzzxQorJDegO3yg/Ox
6EbbA4URwx3k/vxgda5lLInjJE7nM7DgxzQYkzxTBSSYEe5vblIrsG5mOauFuYgK
cpEM/PMdgNqELd12AGGYLVnqQOElDyJZcrSDpDTaAwfaIzFnRKEWdJzkkFCoUvnJ
NTa+AhdAhu9HFom93SIDvoBy7KeS8mcPbzFjpnhPzAFwkdaXQB4VC9aJc8Fr3SzW
6LL1SIKYZttiZYQcyrS4nHSGX01FSMfl2zGQBlQXgot/VhZzu+cBeAfPmKc0RSnU
VVtHY3NXS7L+XV5wCkcX8upwUQcf6mi+s4+TpeeDoKLMQ0NS4sa6R8SgKMtlJrvR
OPtbMNzsr6/Syg3kH6zAurXWey8sNETtCPNtKMmG41EcjrjRA8iQfuUv8sqgTdIh
QiiXIg==
-----END CERTIFICATE-----`;

// Create a new pool instance
const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT), // <-- important on Windows
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  // ✅ SSL enabled (fixes: SELF_SIGNED_CERT_IN_CHAIN)
  ssl: {
    rejectUnauthorized: true,
    ca: AIVEN_CA,
  },
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = pool;
