# Guía de Despliegue Manual en Vercel (Sin GitHub)

Para desplegar este proyecto directamente en Vercel sin usar un repositorio Git, sigue estos pasos:

## 1. Prerrequisitos

Asegúrate de tener la CLI de Vercel instalada (ya incluida en el proyecto via `npx`).

## 2. Configuración del Proyecto en Vercel

1.  Abre una terminal en la carpeta del proyecto.
2.  Ejecuta el siguiente comando para iniciar sesión y vincular el proyecto:
    ```bash
    npx vercel login
    npx vercel link
    ```
    *   Sigue las instrucciones en pantalla.
    *   Cuando pregunte "Link to existing project?", selecciona "No" si es la primera vez, o "Yes" si ya existe `aquaflow-arqs`.
    *   Usa el nombre de proyecto: **aquaflow-arqs**

## 3. Configuración de Variables de Entorno (CRÍTICO)

Antes de desplegar, debes configurar las variables de entorno en Vercel.

**Opción A: Desde el Dashboard (Recomendado)**
1.  Ve a [vercel.com/dashboard](https://vercel.com/dashboard).
2.  Selecciona el proyecto **aquaflow-arqs**.
3.  Ve a **Settings > Environment Variables**.
4.  Agrega las siguientes variables (copia los valores de tu archivo `.env` local):
    *   `DATABASE_URL`: (Tu URL de PostgreSQL, por ejemplo Railway/Neon, con `sslmode=require` si aplica)
    *   `NEXTAUTH_SECRET`: (Tu secreto local)
    *   `NEXTAUTH_URL`: `https://aquaflow-arqs.vercel.app`

**Opción B: Desde la Terminal**
Ejecuta:
```bash
npx vercel env add DATABASE_URL
# Pega el valor cuando te lo pida
npx vercel env add NEXTAUTH_SECRET
# Pega el valor cuando te lo pida
npx vercel env add NEXTAUTH_URL
# Pega el valor: https://aquaflow-arqs.vercel.app
```

## 4. Despliegue a Producción

Una vez configuradas las variables, despliega el proyecto:

```bash
npx vercel --prod
```

Este comando subirá tu código local, construirá la aplicación en la nube de Vercel y la publicará en `https://aquaflow-arqs.vercel.app`.
