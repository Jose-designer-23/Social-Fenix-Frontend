# 🐦‍🔥 Social Fénix - Aplicación Cliente (Frontend)

> **Rise. Connect. Ignite.** Social Fénix es una red social moderna que permite a los usuarios **publicar sus recuerdos en el presente y revivirlos en el futuro**.

Este repositorio contiene la aplicación cliente (Frontend) del proyecto Social Fénix, **liberada bajo la Licencia MIT** para fomentar el estudio, la contribución y la innovación en el desarrollo de redes sociales.

## 🚀 Stack Tecnológico

El frontend está construido sobre un stack moderno y escalable, con un fuerte enfoque en el tipado y la robustez:

| Categoría | Tecnología | Enfoque |
| :--- | :--- | :--- |
| **Framework** | **React / Vite** | Desarrollo rápido y gestión eficiente de la UI. |
| **Lenguaje** | **TypeScript** | Tipado estático para asegurar la calidad del código. |
| **Estilos** | **Tailwind CSS** | Framework CSS utility-first para un diseño rápido y personalizado. |
| **Componentes** | **Shadcn UI** | Componentes de alta calidad y accesibles (Alert-dialog, Card, Dropdown-menu, etc.). |
| **Gestión** | **AuthContext** | Manejo de sesión, autorización, *tokens* y conexión de WebSockets en tiempo real. |

---

## ✨ Características Principales

El diseño de Social Fénix se centra en la usabilidad y la respuesta en tiempo real, ofreciendo una experiencia rica en funcionalidades:

### 🎨 Diseño y Responsividad

* **Web Responsive:** Diseño adaptativo que pasa a modo **Tablet** (a partir de 1280px) y **Móvil** (a partir de 1025px), organizando el menú de navegación, mensajes directos y configuración en un **menú hamburguesa** lateral.
* **Estilo Coherente:** Implementación de componentes de **Shadcn** y utilidades de **Tailwind CSS** para un *look and feel* moderno y redondeado.

### 📰 Feed y Estructura

* **Layout de Tres Columnas:** El *feed* se organiza en navegación izquierda (tarjeta de usuario, configuración), contenido central (creación de publicaciones y *feed* cronológico) y mensajes directos.
* **Creación de Publicaciones:** Componente principal con *textarea*, soporte para subir fotos/videos y emoticonos, siempre accesible.
* **Paginación:** Las publicaciones se cargan cada **20 elementos** para garantizar un alto rendimiento.

### 🔄 Interacción Social Avanzada

* **Comentarios Anidados (Nivel 4):** Soporte robusto para hilos de comentarios, permitiendo respuestas de respuestas hasta cuatro niveles de profundidad.
    * Modal para comentarios a publicaciones.
    * Expansión de *textarea* para respuestas anidadas a comentarios.
* **Toggles Integrados:** Botones con contadores para *Likes*, *Reposts* y *Comentar* dentro de la tarjeta de publicación.
* **Buscador en Tiempo Real:** El buscador en el *header* muestra una lista *scrollable* de sugerencias de usuarios mientras escribes.

### 🔔 Notificaciones y Mensajería en Vivo

* **Alertas Visuales:** El botón de notificaciones cambia dinámicamente de color (rojo, verde, azul) e incluso a un **gradiente** para reflejar la naturaleza de las notificaciones entrantes (*likes*, *reposts*, *comments*).
* **Mensajería Directa:** Desplegable con lista de conversaciones. Modal de chat con historial y manejo del estado de 'leído'.

### 👤 Página de Perfil

* **Gestión de Perfil:** Componentes para actualizar nombre, biografía y enlace, además de un modal para visualizar seguidores y seguidos.
* **Navegación de Contenido:** Pestañas para ver **Publicaciones, Republicaciones, Comentarios, Likes y Multimedia**, con un comportamiento deslizable en pantallas estrechas.

---

## 🛠️ Cómo Empezar

Para poder visualizar esta aplicación, necesitarás un **Backend compatible** que implemente las rutas de la API (Auth, Feed, Chat, etc.).

### Prerrequisitos

* Node.js (versión LTS recomendada)
* npm o yarn

### Pasos

1.  Clonar el repositorio:
    ```bash
    git clone [https://github.com/](https://github.com/)Jose-designer-23/social-fenix-frontend.git
    cd social-fenix-frontend
    ```
2.  Instalar dependencias:
    ```bash
    npm install
    ```
3.  Configurar Variables de Entorno:
    Crea un archivo `.env` o `.env.local` y define las variables de entorno necesarias para apuntar a tu API y WebSockets.

4.  Ejecutar la aplicación:
    ```bash
    npm run dev
    ```

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT.

**Copyright (c) 2025 José Ángel Martín González**
