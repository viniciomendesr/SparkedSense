#pragma once

// ============================================================================
// Template de credenciais — Nó 2 (ESP32-S3)
// ============================================================================
//
// Copie este arquivo para `secrets.h` no mesmo diretório e preencha com a sua
// rede antes de compilar:
//
//     cp secrets.example.h secrets.h
//
// `secrets.h` está no .gitignore e nunca deve ser commitado. Este template,
// sim — ele documenta quais símbolos o sketch espera encontrar.
//
// A rede precisa ser 2.4 GHz: o ESP32-S3 não tem rádio 5 GHz.

static const char* WIFI_SSID     = "sua-rede-2.4ghz";
static const char* WIFI_PASSWORD = "sua-senha";
