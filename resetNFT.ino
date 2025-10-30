#include <EEPROM.h>

// Defina o mesmo tamanho de EEPROM do seu sketch principal
#define EEPROM_SIZE 128

// Endereço e tamanho onde a NFT é armazenada (do seu sketch principal)
#define NFT_ADDRESS_START 33
#define NFT_STORAGE_SIZE 64

void setup() {
  Serial.begin(115200);
  Serial.println("\n\n--- Ferramenta de Limpeza de NFT ---");

  // Inicializa a EEPROM
  EEPROM.begin(EEPROM_SIZE);

  Serial.println("EEPROM inicializada.");
  Serial.println("Para apagar a NFT armazenada, digite 'ERASE_NFT' e pressione Enter.");
  Serial.println("AVISO: Esta ação é permanente!");
}

void loop() {
  // Verifica se há algum dado vindo da Serial
  if (Serial.available() > 0) {
    // Lê o comando enviado
    String command = Serial.readStringUntil('\n');
    command.trim(); // Remove espaços em branco e quebras de linha

    // Verifica se o comando é o correto
    if (command == "ERASE_NFT") {
      Serial.println("\nComando recebido. Apagando a NFT da memória...");

      // Sobrescreve a área da memória da NFT com zeros
      for (int i = 0; i < NFT_STORAGE_SIZE; i++) {
        EEPROM.write(NFT_ADDRESS_START + i, 0);
      }

      // Salva as mudanças na EEPROM (muito importante no ESP8266!)
      if (EEPROM.commit()) {
        Serial.println("✅ SUCESSO: NFT apagada da memória EEPROM.");
        
        // Verificação opcional: tenta ler o que acabou de apagar
        char buffer[NFT_STORAGE_SIZE + 1];
        for (int i = 0; i < NFT_STORAGE_SIZE; i++) {
          buffer[i] = 0;
        }
        buffer[NFT_STORAGE_SIZE] = '\0'; // Adiciona o terminador nulo
        Serial.print("Verificação (deve estar em branco): '");
        Serial.print(buffer);
        Serial.println("'");

      } else {
        Serial.println("❌ ERRO: Falha ao salvar as mudanças na EEPROM.");
      }
      
      Serial.println("\nOperação concluída. Você pode agora carregar seu sketch principal.");

    } else {
      Serial.println("Comando desconhecido: '" + command + "'. Tente 'ERASE_NFT'.");
    }
  }
}
