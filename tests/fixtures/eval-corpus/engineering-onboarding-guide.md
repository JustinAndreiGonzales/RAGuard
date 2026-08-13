# Aurora Robotics Engineering Onboarding Guide

## Week One

Your first week at Aurora Robotics is focused on getting set up. You will receive a company laptop preloaded with development tools, and IT will provision your accounts for email, Slack, Jira, Confluence, and GitHub. Take time in your first week to meet with your manager and the members of your immediate team, and review the architecture documentation for the systems you'll be working on.

## Local Development Environment

Aurora Robotics' backend services are primarily built with Node.js and run in Docker containers for local development. New engineers should install Docker Desktop and Node.js as described in the "Getting Started" page in Confluence. Aurora Robotics also maintains an internal command-line tool called `aurora-cli`, which automates common tasks like spinning up local service dependencies, running database migrations, and seeding test data.

## Code Review Policy

All code changes at Aurora Robotics require at least 2 approvals from other engineers before merging, regardless of the size of the change. Reviewers are expected to check for correctness, test coverage, and adherence to team coding conventions. Changes to shared infrastructure or the fleet management dashboard's data pipeline require an additional review from a member of the platform team.

## On-Call Rotation

New engineers join the on-call rotation after their first 3 months at the company, once they have ramped up on the relevant systems. On-call shifts are one week long, and engineers are paged through PagerDuty for production incidents.

## Internal Tools

Aurora Robotics uses Jira for issue tracking, Confluence for internal documentation, and PagerDuty for on-call alerting and incident management. Most engineering teams also use Slack for day-to-day communication and GitHub for source control and pull requests.

## Mentorship

Every new engineer is assigned an onboarding buddy for their first 90 days. Your buddy is available to answer day-to-day questions, help you navigate the codebase, and make sure you feel supported as you ramp up.
