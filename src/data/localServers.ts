// Mock local development servers for the Network panel.
export interface LocalServer {
  id: string;
  port: number;
  name: string;
  framework: string;
  status: 'running' | 'stopped' | 'error';
  pid: number;
  uptime: string;
  url: string;
  description: string;
  routes: Array<{
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    path: string;
    handler: string;
    description: string;
    params?: Array<{ name: string; type: string; required: boolean; description: string }>;
  }>;
}

export const localServers: LocalServer[] = [
  {
    id: 'srv-3000',
    port: 3000,
    name: 'Frontend Dev (Vite)',
    framework: 'React + Vite',
    status: 'running',
    pid: 18432,
    uptime: '2h 14min',
    url: 'http://localhost:3000',
    description: 'Serveur de développement Vite avec HMR',
    routes: [
      { method: 'GET', path: '/', handler: 'IndexPage', description: 'Page d\'accueil' },
      { method: 'GET', path: '/login', handler: 'LoginPage', description: 'Connexion utilisateur' },
      { method: 'GET', path: '/dashboard', handler: 'DashboardPage', description: 'Tableau de bord' },
      { method: 'GET', path: '/api/health', handler: 'health', description: 'Vite proxy → backend health' },
    ],
  },
  {
    id: 'srv-8000',
    port: 8000,
    name: 'API Backend (FastAPI)',
    framework: 'Python + FastAPI',
    status: 'running',
    pid: 22871,
    uptime: '4h 02min',
    url: 'http://localhost:8000',
    description: 'API REST principale avec auth JWT et PostgreSQL',
    routes: [
      { method: 'GET', path: '/health', handler: 'health_check', description: 'Vérifier l\'état du serveur' },
      { method: 'GET', path: '/api/v1/users', handler: 'list_users', description: 'Lister les utilisateurs',
        params: [
          { name: 'page', type: 'int', required: false, description: 'Numéro de page (1+)' },
          { name: 'per_page', type: 'int', required: false, description: 'Items par page (max 100)' },
          { name: 'search', type: 'string', required: false, description: 'Filtre par nom/email' },
        ] },
      { method: 'GET', path: '/api/v1/users/:id', handler: 'get_user', description: 'Détail d\'un utilisateur',
        params: [{ name: 'id', type: 'uuid', required: true, description: 'ID de l\'utilisateur' }] },
      { method: 'POST', path: '/api/v1/users', handler: 'create_user', description: 'Créer un utilisateur',
        params: [
          { name: 'email', type: 'string', required: true, description: 'Email unique' },
          { name: 'password', type: 'string', required: true, description: 'Mot de passe (min 8 chars)' },
          { name: 'name', type: 'string', required: true, description: 'Nom complet' },
        ] },
      { method: 'PUT', path: '/api/v1/users/:id', handler: 'update_user', description: 'Modifier un utilisateur' },
      { method: 'DELETE', path: '/api/v1/users/:id', handler: 'delete_user', description: 'Supprimer un utilisateur' },
      { method: 'POST', path: '/api/v1/auth/login', handler: 'login', description: 'Authentification → JWT',
        params: [
          { name: 'email', type: 'string', required: true, description: 'Email' },
          { name: 'password', type: 'string', required: true, description: 'Mot de passe' },
        ] },
      { method: 'POST', path: '/api/v1/auth/refresh', handler: 'refresh_token', description: 'Rafraîchir le JWT' },
      { method: 'GET', path: '/api/v1/projects', handler: 'list_projects', description: 'Projets de l\'utilisateur' },
      { method: 'POST', path: '/api/v1/projects', handler: 'create_project', description: 'Créer un projet' },
    ],
  },
  {
    id: 'srv-5432',
    port: 5432,
    name: 'PostgreSQL',
    framework: 'PostgreSQL 16',
    status: 'running',
    pid: 14202,
    uptime: '6 jours',
    url: 'postgresql://localhost:5432',
    description: 'Base de données principale',
    routes: [],
  },
  {
    id: 'srv-6379',
    port: 6379,
    name: 'Redis Cache',
    framework: 'Redis 7.2',
    status: 'running',
    pid: 14515,
    uptime: '6 jours',
    url: 'redis://localhost:6379',
    description: 'Cache et file de tâches',
    routes: [],
  },
  {
    id: 'srv-5173',
    port: 5173,
    name: 'Storybook',
    framework: 'Storybook 8',
    status: 'stopped',
    pid: 0,
    uptime: '—',
    url: 'http://localhost:5173',
    description: 'Documentation des composants UI',
    routes: [],
  },
  {
    id: 'srv-9000',
    port: 9000,
    name: 'MinIO (S3-compatible)',
    framework: 'MinIO',
    status: 'error',
    pid: 0,
    uptime: '—',
    url: 'http://localhost:9000',
    description: 'Stockage objet local',
    routes: [],
  },
];
