# Szkolny Helpdesk

Aplikacja do zgłaszania usterek w szkole i obsługi zgłoszeń przez zespół techniczny. Interfejs korzysta z PocketBase jako backendu.

## Uruchomienie lokalne

1. Zainstaluj zależności: `npm install`.
2. Dodaj adres serwera PocketBase do `.env.local`:

   ```env
   NEXT_PUBLIC_POCKETBASE_URL=https://twoj-serwer-pocketbase.example
   ```

3. Uruchom aplikację: `npm run dev`.

Rejestracja tworzy konto użytkownika. Rolę technika nadaje administrator w PocketBase.

## Polecenia

- `npm run dev` — uruchamia serwer deweloperski.
- `npm run lint` — sprawdza kod ESLintem.
- `npm run build` — buduje aplikację produkcyjną.

Wymagane kolekcje PocketBase to `users`, `tickets`, `ticket_events` i `ticket_comments`. Dostęp do ich rekordów zależy od reguł skonfigurowanych na serwerze.
