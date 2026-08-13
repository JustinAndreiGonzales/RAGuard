# Incident Postmortem — Falcon Drone v2 Firmware Incident, November 2, 2023

## Summary

On November 2, 2023, a firmware update pushed to Falcon Drone v2 units in the field caused approximately 340 drones to become unresponsive ("bricked"), requiring manual re-flashing at authorized service centers. Total support and remediation costs were approximately $420,000.

## Timeline

At 7:00 AM Pacific Time, Aurora Robotics began a routine over-the-air (OTA) firmware update rollout to all Falcon Drone v2 units in the field. Within two hours, field service teams and customers began reporting drones that would not power on or respond to the fleet management dashboard. By 11:00 AM, the rollout was halted, but approximately 340 units had already received the faulty update.

## Root Cause

The root cause was a missing compatibility check in the OTA update pipeline. The new firmware assumed a minimum battery controller firmware version that was not present on a subset of older Falcon Drone v2 units still running their original factory battery firmware. Installing the new flight firmware on top of the older battery firmware caused the drone's power management system to enter a fault state on boot, which appeared to affected customers as a fully bricked device.

## Impact

Approximately 340 Falcon Drone v2 units required manual re-flashing at Aurora Robotics service centers, none of which could be performed remotely. Total support and remediation costs, including technician time, shipping, and customer credits, were approximately $420,000. This cost was reflected in Aurora Robotics' fiscal year 2023 financial results.

## Resolution

Affected units were shipped to the nearest service center for manual re-flashing. Aurora Robotics also released an emergency battery firmware update to bring all remaining fielded units to the required minimum version before re-attempting the flight firmware rollout.

## Follow-up Actions

Aurora Robotics introduced a mandatory staged rollout process for all future OTA updates, starting with a small percentage of the fleet and expanding gradually. Hardware-in-the-loop testing against representative battery firmware versions is now required before any OTA update is approved for release.
