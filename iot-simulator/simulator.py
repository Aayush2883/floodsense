import time
import json
import argparse
import sys
from datetime import datetime, timezone

try:
    import boto3
except ImportError:
    print("[ERROR] boto3 is not installed. Run: pip install boto3")
    sys.exit(1)

# Predefined Sensor Coordinates in Patna
SENSOR_LOCATIONS = {
    "sensor-01": {"lat": 25.6107, "lng": 85.1416, "regionCode": "25.61_85.14", "city": "Patna (Gandhi Maidan)"},
    "sensor-02": {"lat": 25.6025, "lng": 85.1585, "regionCode": "25.60_85.15", "city": "Patna (Rajendra Nagar)"},
    "sensor-03": {"lat": 25.6210, "lng": 85.0450, "regionCode": "25.62_85.04", "city": "Patna (Danapur)"},
}

def main():
    parser = argparse.ArgumentParser(description="FloodSense IoT Water Sensor Simulator")
    parser.add_argument("--sensor-id", default="sensor-01", choices=["sensor-01", "sensor-02", "sensor-03"], help="Sensor ID")
    parser.add_argument("--scenario", default="danger-slow", choices=["danger-slow", "normal", "flash-flood"], help="Simulation scenario")
    parser.add_argument("--region", default="ap-southeast-2", help="AWS Region")
    parser.add_argument("--endpoint", default="a37w3xlpofts9a-ats.iot.ap-southeast-2.amazonaws.com", help="AWS IoT Endpoint")
    args = parser.parse_args()

    sensor_meta = SENSOR_LOCATIONS.get(args.sensor_id, SENSOR_LOCATIONS["sensor-01"])

    print(f"=== FloodSense Sensor Simulator: [{args.sensor_id}] | Location: {sensor_meta['city']} ===")
    print(f"Connecting to AWS IoT Data Plane ({args.region}) over HTTPS Port 443 ...")

    # Connect over HTTPS Port 443 (Firewall & Wi-Fi safe!)
    iot_client = boto3.client(
        'iot-data',
        region_name=args.region,
        endpoint_url=f"https://{args.endpoint}"
    )

    print("[SUCCESS] Connected to AWS IoT Data Broker!\n")

    water_level = 40.0
    topic = "floodsense/sensors/readings"

    try:
        while True:
            if args.scenario == "danger-slow":
                water_level += 4.0
            elif args.scenario == "flash-flood":
                water_level += 10.0
            else:
                import random
                water_level = 35.0 + random.uniform(-2.0, 2.0)

            if water_level >= 150:
                alert = "DANGER"
            elif water_level >= 90:
                alert = "WARNING"
            else:
                alert = "SAFE"

            payload = {
                "sensorId": args.sensor_id,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "waterLevelCm": round(water_level, 1),
                "rainfallMm": 14.2 if alert != "SAFE" else 1.2,
                "regionCode": sensor_meta["regionCode"],
                "lat": sensor_meta["lat"],
                "lng": sensor_meta["lng"],
                "source": "simulator",
                "alert": alert
            }

            iot_client.publish(
                topic=topic,
                qos=1,
                payload=json.dumps(payload)
            )

            print(f"[{payload['timestamp']}] {args.sensor_id} -> Water: {payload['waterLevelCm']} cm | Status: [{payload['alert']}]")

            time.sleep(2)

    except KeyboardInterrupt:
        print("\nStopping sensor simulator...")

if __name__ == "__main__":
    main()
