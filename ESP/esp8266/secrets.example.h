#pragma once

// ============================================================================
// Template de credenciais — Nó 1 (ESP8266)
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
// Mesmos nomes de símbolo do Nó 2 (`ESP/esp32s3/secrets.example.h`), de
// propósito: um único contrato de credenciais pros dois firmwares.

static const char* WIFI_SSID     = "sua-rede-2.4ghz";
static const char* WIFI_PASSWORD = "sua-senha";
