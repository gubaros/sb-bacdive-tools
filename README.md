# BacDive API

A REST API service for accessing and searching bacteria information from the BacDive database.

## Description

This project provides a REST API that allows users to:
- Access detailed bacteria information
- Search bacteria by genus and species
- Get paginated results
- Access basic database statistics

## API Endpoints

### GET /api/bacteria
Returns a paginated list of bacteria
- Query params: 
  - page (default: 1)
  - limit (default: 100)

### GET /api/bacteria/:id
Returns detailed information for a specific bacteria by ID

### GET /api/search
Search bacteria by genus and/or species
- Query params:
  - genus
  - species

### GET /api/stats
Returns general statistics about the database

## Installation

1. Clone the repository
2. Install dependencies: