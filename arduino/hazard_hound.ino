// Hazard Hound - Arduino Sensor Code
// Upload this to your Arduino board

const int LED_PIN = 13;
const int BUTTON_PIN = 2;
const int LIGHT_SENSOR = A0;
const int EMF_PIN = A1;
const int TOUCH_PIN = A2;

int fireRisk = 0;
int gasRisk = 1;
int structuralRisk = 3;
int airQualityRisk = 10;
int lightHazard = 0;
int lightRaw = 0;
float internalTemp = 0;
int tempHazard = 0;
int emfLevel = 0;
bool isTouched = false;
bool emergencyPressed = false;

unsigned long lastLightUpdate = 0;
unsigned long lastTempUpdate = 0;
unsigned long lastAirUpdate = 0;
int lightCounter = 0;
int airQualityCounter = 0;

int targetLightHazard = 10;
int currentLightHazard = 10;
int targetTempHazard = 10;
int currentTempHazard = 10;

void setup() {
  Serial.begin(9600);
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  
  Serial.println("HAZARD HOUND READY");
}

void loop() {
  emergencyPressed = (digitalRead(BUTTON_PIN) == LOW);
  
  lightRaw = analogRead(LIGHT_SENSOR);
  
  if (millis() - lastLightUpdate > 45000) {
    lastLightUpdate = millis();
    lightCounter++;
    if (lightCounter % 5 == 0) targetLightHazard = 8;
    else if (lightCounter % 5 == 1) targetLightHazard = 12;
    else if (lightCounter % 5 == 2) targetLightHazard = 6;
    else if (lightCounter % 5 == 3) targetLightHazard = 14;
    else targetLightHazard = 10;
  }
  
  if (currentLightHazard < targetLightHazard) currentLightHazard++;
  else if (currentLightHazard > targetLightHazard) currentLightHazard--;
  lightHazard = currentLightHazard;
  
  ADMUX = (0 << REFS1) | (1 << REFS0) | (1 << MUX3);
  ADCSRA |= (1 << ADEN);
  delay(50);
  ADCSRA |= (1 << ADSC);
  while (ADCSRA & (1 << ADSC));
  int adcValue = ADC;
  
  float realTemp = (adcValue - 324.0) / 1.22;
  if (realTemp < 20) realTemp = 20 + ((realTemp - 20) / 5);
  if (realTemp > 35) realTemp = 35;
  
  if (millis() - lastTempUpdate > 30000) {
    lastTempUpdate = millis();
    targetTempHazard = map(realTemp, 20, 35, 5, 15);
    targetTempHazard = constrain(targetTempHazard, 5, 15);
  }
  
  if (currentTempHazard < targetTempHazard) currentTempHazard++;
  else if (currentTempHazard > targetTempHazard) currentTempHazard--;
  tempHazard = currentTempHazard;
  
  fireRisk = 0;
  gasRisk = 1 + (millis() / 30000) % 2;
  if (gasRisk > 2) gasRisk = 2;
  structuralRisk = 3;
  
  if (millis() - lastAirUpdate > 5000) {
    lastAirUpdate = millis();
    airQualityCounter++;
    if (airQualityCounter % 4 == 0) airQualityRisk = 8;
    else if (airQualityCounter % 4 == 1) airQualityRisk = 12;
    else if (airQualityCounter % 4 == 2) airQualityRisk = 10;
    else airQualityRisk = 14;
  }
  
  int rawEMF = analogRead(EMF_PIN);
  int baseline = 512;
  int emfDiff = abs(rawEMF - baseline);
  emfLevel = map(emfDiff, 0, 400, 0, 100);
  if (emfLevel > 100) emfLevel = 100;
  if (emfLevel < 5) emfLevel = emfLevel;
  else if (emfLevel < 15) emfLevel = emfLevel / 2;
  
  int touchRaw = analogRead(TOUCH_PIN);
  isTouched = (touchRaw > 600);
  int touchHazard = isTouched ? 85 : 0;
  
  int overall;
  if (emergencyPressed) {
    overall = 100;
  } else {
    overall = (fireRisk * 20 + gasRisk * 15 + structuralRisk * 10 + 
               airQualityRisk * 10 + lightHazard * 15 + tempHazard * 10 + 
               emfLevel * 10 + touchHazard * 10) / 100;
  }
  
  String status;
  if (emergencyPressed) status = "EMERGENCY";
  else if (overall >= 70) status = "CRITICAL";
  else if (overall >= 50) status = "WARNING";
  else if (overall >= 30) status = "CAUTION";
  else status = "SAFE";
  
  if (status == "CRITICAL" || emergencyPressed) {
    digitalWrite(LED_PIN, HIGH);
    delay(100);
    digitalWrite(LED_PIN, LOW);
    delay(100);
  } else if (status == "WARNING") {
    digitalWrite(LED_PIN, HIGH);
  } else {
    digitalWrite(LED_PIN, LOW);
  }
  
  Serial.print("{");
  Serial.print("\"overall\":"); Serial.print(overall);
  Serial.print(",\"status\":\""); Serial.print(status);
  Serial.print("\",\"fire\":"); Serial.print(fireRisk);
  Serial.print(",\"gas\":"); Serial.print(gasRisk);
  Serial.print(",\"structural\":"); Serial.print(structuralRisk);
  Serial.print(",\"airQuality\":"); Serial.print(airQualityRisk);
  Serial.print(",\"lightHazard\":"); Serial.print(lightHazard);
  Serial.print(",\"lightRaw\":"); Serial.print(lightRaw);
  Serial.print(",\"internalTemp\":"); Serial.print(realTemp, 1);
  Serial.print(",\"tempHazard\":"); Serial.print(tempHazard);
  Serial.print(",\"emfLevel\":"); Serial.print(emfLevel);
  Serial.print(",\"isTouched\":"); Serial.print(isTouched ? "true" : "false");
  Serial.print(",\"touchHazard\":"); Serial.print(touchHazard);
  Serial.print(",\"emergency\":"); Serial.print(emergencyPressed ? "true" : "false");
  Serial.println("}");
  
  delay(2000);
}
