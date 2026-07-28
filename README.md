# pennywise-mobile
PennyWise - A not-so-boring cash management app. Track your spending and save smarter with a simple, clever vibe.

## API configuration

Use Node 20.19.4, copy `.env.example` to `.env`, and set
`EXPO_PUBLIC_API_BASE_URL` to the deployed API URL (including `/api`) before
running `npm start`.

Expo inlines `EXPO_PUBLIC_*` values into the app bundle at bundle time; they
are not read from the device environment at runtime. Set the value before
`expo start`, and configure the same value in the EAS build profile before
building an APK.
