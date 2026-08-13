# Incident Postmortem — Fleet Dashboard Outage, March 14, 2023

## Summary

On March 14, 2023, Aurora Robotics' cloud-based fleet management dashboard was unavailable for approximately 6 hours, preventing roughly 1,200 customers from viewing live drone telemetry or historical flight data during the outage window.

## Timeline

At 9:12 AM Pacific Time, a marketing email campaign drove an unusually large spike in new user signups and dashboard logins. By 9:40 AM, the database connection pool serving the fleet management dashboard was fully exhausted, and new requests began failing. The on-call engineering team was paged at 9:47 AM and began investigating. Full service was restored at approximately 3:15 PM Pacific Time.

## Root Cause

The root cause of the outage was database connection pool exhaustion. The fleet management dashboard's backend service was configured with a fixed connection pool size that had not been re-evaluated since the service was first deployed. The sudden spike in concurrent logins from the marketing campaign exceeded the pool's capacity, and requests queued faster than they could be served, eventually timing out.

## Impact

Approximately 1,200 customers were unable to access live drone telemetry or historical flight logs for up to 6 hours. No drone flights in progress were affected, as flight control operates independently of the web dashboard. No data was lost during the incident.

## Resolution

The immediate fix was to manually scale the database connection pool size and restart the affected backend service. Following the incident, the engineering team implemented automatic connection pool autoscaling based on active session count.

## Follow-up Actions

A new monitoring alert was added to notify the on-call engineer when connection pool utilization exceeds 80%, well before exhaustion occurs. The team also established a process to review infrastructure capacity ahead of planned marketing campaigns.
