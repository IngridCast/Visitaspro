// Departamentos de Honduras con sus municipios principales.
// La lista de municipios no es completa: agregar aquí los que hagan falta.
export const DEPARTMENTS = {
  'Atlántida': ['La Ceiba', 'Tela', 'El Porvenir', 'Esparta', 'Jutiapa', 'La Masica', 'San Francisco', 'Arizona'],
  'Choluteca': ['Choluteca', 'San Marcos de Colón', 'Marcovia', 'Pespire', 'El Triunfo', 'Namasigüe', 'Orocuina'],
  'Colón': ['Trujillo', 'Tocoa', 'Sonaguera', 'Saba', 'Bonito Oriental', 'Balfate', 'Iriona'],
  'Comayagua': ['Comayagua', 'Siguatepeque', 'La Libertad', 'Villa de San Antonio', 'Ajuterique', 'Taulabé', 'Esquías'],
  'Copán': ['Santa Rosa de Copán', 'Copán Ruinas', 'Nueva Arcadia', 'Florida', 'Corquín', 'Dulce Nombre'],
  'Cortés': [
    'San Pedro Sula', 'Choloma', 'Puerto Cortés', 'Villanueva', 'La Lima', 'Omoa', 'Pimienta',
    'Potrerillos', 'San Manuel', 'Santa Cruz de Yojoa', 'San Antonio de Cortés', 'San Francisco de Yojoa',
  ],
  'El Paraíso': ['Yuscarán', 'Danlí', 'El Paraíso', 'Trojes', 'Teupasenti', 'Morocelí'],
  'Francisco Morazán': [
    'Tegucigalpa', 'Comayagüela', 'Valle de Ángeles', 'Santa Lucía', 'Talanga', 'Ojojona',
    'Sabanagrande', 'Guaimaca', 'San Juan de Flores', 'Cedros',
  ],
  'Gracias a Dios': ['Puerto Lempira', 'Brus Laguna', 'Ahuas', 'Wampusirpi', 'Juan Francisco Bulnes', 'Villeda Morales'],
  'Intibucá': ['La Esperanza', 'Intibucá', 'Jesús de Otoro', 'Yamaranguila', 'San Juan'],
  'Islas de la Bahía': ['Roatán', 'José Santos Guardiola', 'Utila', 'Guanaja'],
  'La Paz': ['La Paz', 'Marcala', 'Santiago de Puringla', 'Chinacla'],
  'Lempira': ['Gracias', 'Erandique', 'Lepaera', 'San Rafael', 'La Iguala'],
  'Ocotepeque': ['Ocotepeque', 'Sinuapa', 'San Marcos', 'La Labor'],
  'Olancho': ['Juticalpa', 'Catacamas', 'Campamento', 'San Esteban', 'Salamá', 'Guayape'],
  'Santa Bárbara': ['Santa Bárbara', 'Quimistán', 'Trinidad', 'San Marcos', 'Macuelizo'],
  'Valle': ['Nacaome', 'San Lorenzo', 'Amapala', 'Langue', 'Goascorán'],
  'Yoro': ['Yoro', 'El Progreso', 'Olanchito', 'Morazán', 'Santa Rita', 'Victoria'],
}

export const DEPARTMENT_NAMES = Object.keys(DEPARTMENTS).sort((a, b) => a.localeCompare(b, 'es'))
