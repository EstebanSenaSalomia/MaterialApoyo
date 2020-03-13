import Vue from 'vue';
import Filters from './config/filtros';
import VueRouter from 'vue-router';
import readXlsxFile from 'read-excel-file';
import "@babel/polyfill";

Vue.use(Filters);
Vue.use(VueRouter);

require('./config/components');
import Timeselector from 'vue-timeselector';
Vue.component('timeselector', Timeselector);

import routes from './config/routes';
const router = new VueRouter({
  mode: 'history',
  routes
});

require('./config/views');
import { ppuNewValue, ppuOldValue } from './config/functions';

window.eventBUS = new Vue;
let vueApp = new Vue({
    el: '#contenedor-vue',
    router,
    data() {
        return {
            base_url: APP_URL.substr(-1) == '/' ? APP_URL.substr(0, APP_URL.length - 1) : APP_URL,
            domain: (APP_URL.split('//')[1]).split('/')[0],
            user: null,
        }
    },
    created() {
        axios
        .post(this.base_url + '/vueComponent/root/user')
        .then((response) => this.user = response.data);
    },
    methods: {
        // funciones importadas como helpers
        ppuNewValue, ppuOldValue,
        /**
         * Busca los permisos del usuario acorde a ruta y sección
         * @param  string ruta    Ruta del menú del cual se requieren los permisos
         * @param  string seccion Sección del menú del cual se requieren los permisos
         * @return Array          Permisos
         */
        permissions: async function(ruta, seccion) {
            let request = new FormData();
            request.append("ruta", ruta);
            request.append("seccion_id", seccion);

            let permisos = [];
            let response = await axios.post(APP_URL + 'permiso/todos', request)
            if (response.data) {
                permisos = response.data;
            }

            return permisos;
        },
        /**
         * Genera objeto query para router-link o como request
         * @param  {Object} filters Filtros
         * @return {Object}         Query
         */
        query: async function(filters) {
            let query = {};

            for (var key in filters) {
                if (['array', 'object'].indexOf(typeof filters[key]) > -1) {
                    if (this.isset(filters[key], 'id')) {
                        query[key] = filters[key].id;
                    }
                    else if (this.isset(filters[key], 'value')) {
                        query[key] = filters[key].value;
                    }
                }
                else if (['string', 'number'].indexOf(typeof filters[key]) > -1 && filters[key]) {
                    query[key] = filters[key];
                }
            }

            return query;
        },
        /**
         * Genera un string de la query de la ruta
         * @param  {Object}  query       [filters || $route.query]
         * @param  {Boolean} fromFilters Indica si la query viene de filtros o de la ruta
         * @param  {Boolean} withPage    Indica si se debe quitar la consulta por página o no
         * @return {String}
         */
        queryString: async function(query, fromFilters = false, withPage = true) {
            let array = [];

            // convertir el objeto filtro en un objeto de query
            if (fromFilters) {
                query = await this.query(query);
            }

            // quitar parámetro de página
            if (!withPage && typeof query.page !== 'undefined') {
                delete query.page;
            }

            for (var key in query) {
                array.push(key + '=' + query[key]);
            }

            return array.length > 0 ? '?' + array.join('&') : '';
        },
        /**
         * Genera url de descarga del archivo en la ruta indicada
         * @param  varchar  file_route  Ruta del archivo (suponiendo dentro del disco public)
         * @param  char     [type='1']  Indica si el archivo se imprime (1) o se descarga
         * @param  varchar  [name='']   Nombre del archivo a descargar
         * @return file
         */
        downloadRoute: function(file_route, type = 1, name = '') {
            return APP_URL + 'descargar/public/' + btoa(file_route) + '/' + type + '/' + name;
        },
        /**
         * Genera url de descarga del archivo en clientes
         * @param  varchar  file_route  Ruta del archivo (suponiendo dentro del disco public)
         * @param  char     [type='I']  Indica si el archivo se imprime (I)
         * @param  varchar  [name='']   Nombre del archivo a descargar
         * @return file
         */
        clientDownloadRoute: function(file_route, type = 'I', name = '') {
            // file_route debe ir sin el public ya que en la ruta de laravel se le antepone
            return APP_URL + 'cd/' + btoa(file_route) + '/' + type + (name ? '/' + btoa(name) : '');
        },
        /**
         * Genera url de descarga del archivo en clientes
         * @param  varchar  file_route  Ruta del archivo (suponiendo dentro del disco public)
         * @param  char     [type='I']  Indica si el archivo se imprime (I)
         * @param  varchar  [name='']   Nombre del archivo a descargar
         * @return file
         */
        workflowDownloadRoute: function(file_route, type = 'I', name = '') {
            // file_route debe ir sin el public ya que en la ruta de laravel se le antepone
            return APP_URL + 'wfd/' + btoa(file_route) + '/' + type + (name ? '/' + btoa(name) : '');
        },
        /**
         * Devuelve un arreglo con los errores detectados en un try-catch
         * @param  {Object} error
         * @return {Array}        Listado de errores obtenidos del objeto error
         */
        catch: function(error) {
            return this.gestionarErrorResponse(error);
        },
        errorCatch: function(error) {
            return this.gestionarErrorResponse(error);
        },
        /**
         * devuelve un array con todos los errores
         * @param  {Object}
         * @return {array}  Array con la lista de errores emitidos por el catch o o validate de laravel
         */
        gestionarErrorResponse: function(response) {
            let respuestas =  [];
            let data;

            if (typeof response === 'string') {
                respuestas = [response];
            }
            else if (Array.isArray(response)) {
                respuestas = response;
            }
            else if (typeof response === 'object') {
                if(response.hasOwnProperty('data')){
                    data = response.data;
                }
                else if(response.hasOwnProperty('response') && response.response.hasOwnProperty('data') ){
                    data = response.response.data;
                }

                if (data) {
                    if (typeof data === 'string') {
                        respuestas = [data];
                    }
                    else if (Array.isArray(data)) {
                        respuestas = data;
                    }
                    else if (typeof data === 'object') {
                        if ('errors' in data) {
                            if (typeof data.errors === 'string') {
                                respuestas = [data.errors];
                            }
                            else if (Array.isArray(data.errors)) {
                                respuestas = data.errors;
                            }
                            else {
                                Object.keys(data.errors).forEach((key) => {
                                    respuestas.push(data.errors[key][0]);
                                });
                            }
                        }
                        else if ('error' in data) {
                            if (typeof data.error === 'string') {
                                respuestas = [data.error];
                            }
                            else if (Array.isArray(data.error)) {
                                respuestas = data.error;
                            }
                            else {
                                Object.keys(data.error).forEach((key) => {
                                    respuestas.push(data.error[key][0]);
                                });
                            }
                        }
                        else if ('message' in data) {
                            if (data.message) {
                                respuestas.push(data.message);
                            }
                            else {
                                respuestas.push(data.exception.split("\\").pop());
                            }
                        }
                        else {
                            for (let error in data) {
                                if (data[error]) {
                                    if (typeof data[error] == 'string') {
                                        if (!data[error].match(/Illuminate|\/vendor\//)) {
                                            respuestas.push(data[error]);
                                        }
                                    }
                                    else if (Array.isArray(data[error])) {
                                        for (let key in data[error]) {
                                            respuestas.push(data[error][key]);
                                        }
                                    }
                                    else if (typeof data[error] === 'object') {
                                        Object.keys(data[error]).forEach((key) => {
                                            let elemento = data[error][key];

                                            if (elemento.file && !elemento.file.match(/\/vendor\/|\/Middleware\/|index.php/)) {
                                                if (elemento.function && elemento.function == '__callStatic' && elemento.line) {
                                                    let archivo = elemento.file.split('/').pop();
                                                    respuestas.push(archivo + ': ' + elemento.line);
                                                }
                                                else if (typeof elemento !== 'object') {
                                                    respuestas.push(elemento);
                                                }
                                            }
                                        });
                                    }
                                }
                            }
                        };
                    }
                    else {
                        respuestas = ['Se ha generado un error inesperado. Por favor contacte a soporte.'];
                        console.log('arrayResponse', response);
                    }
                }
                else if (response.hasOwnProperty('mensaje') || 'message' in response) {
                    respuestas = [response.message];
                }
            }

            if (respuestas[0] == 'HttpException') {
                window.location.href = '/login';
            }
            else {
                return respuestas;
            }
        },
        /**
         * Valida si variables existen dentro del objeto
         * @param  {Object} object (value)
         * @param  {String} string Variable(s) a buscar (deben venir en formato "ruta" o "ruta.recepcion.hola")
         * @return {Boolean}
         */
        isset: function(object, string) {
            let array = string.split('.'),
            exists = true,
            exit = false;

            do {
                let length_check = false,
                length_position = 0;
                // VALIDAR QUE objeto NO SEA NULO NI VACÍO NI INDEFINIDO
                if (object !== null && object !== '' && typeof object !== 'undefined'
                    && array[0] !== null && array[0] !== '' && typeof array[0] !== 'undefined'
                ) {
                    // VERIFICAR SI POSICIÓN ES ARREGLO
                    if (array[0].indexOf('[') > -1) {
                       length_check = true;

                       let tmp = array[0].split('[');
                       array[0] = tmp[0];
                       length_position = tmp[1].replace(']', '');
                   }

                    // VERIFICAR SI POSICIÓN EXISTE EN OBJETO
                    if (array[0] in object) {
                        // VALIDAR QUE objeto NO SEA NULO NI VACÍO NI INDEFINIDO
                        if (object[array[0]] !== null && object[array[0]] !== '' && typeof object[array[0]] !== 'undefined') {
                            object = object[array[0]];
                            if (length_check) {
                                object = object[length_position];
                            }

                            if (array.length > 1) {
                                array.shift();
                            }
                            else {
                                exit = true;
                            }
                        }
                        else {
                            exit = true;
                            exists = false;
                        }
                    }
                    else {
                        exit = true;
                        exists = false;
                    }
                }
                else {
                    exit = true;
                    exists = false;
                }
            } while(exists && !exit);

            return exists;
        },
        /**
         * Obtiene la estructura de la carga masiva acorde a la sección, acción y mandante ingresados
         * @param  integer action        Identificador de la acción de la carga masiva
         * @param  integer [provider=''] Identificador del mandante
         * @return Array                 Estructura de la carga masiva
         */
        masiveStructure: async function(action, provider = '') {
            let request = new FormData();
            request.append('accion', action);
            request.append('mandante', provider);

            let _return = {
                estructura: [],
                cabeceras: {
                    header: [],
                    database: [],
                }
            };
            let response = await axios.post(APP_URL + 'masiva/estructura', request);
            if (response.data) {
                _return.estructura = response.data.estructura;
                _return.cabeceras.database = response.data.cabeceras_database;
                _return.cabeceras.header = response.data.cabeceras_header;
            }

            return _return;
        },
        /**
         * Lee carga masiva y retorna los datos en una matriz
         * @param  File    file       Archivo carga masiva
         * @param  integer length     Largo máximo de la cabecera
         * @param  Boolean lowercase  Indica si se debe enviar el nombre del campo como minúsculas o como viene
         * @param  Boolean replace_header_spaces  Indica si se debe reemplazar los espacios en los nombres de las columnas de cabecera
         * @return Array              Matriz de arreglos [{columna_a:valor_a, columna_b:valor_b}, {...}]
         */
        masiveRead: async function(file, length, lowercase = false, replace_header_spaces = false) {
            let array = [];
            let header = [];
            let object = {};

            await readXlsxFile(file).then((rows) => {
                rows.forEach((row, row_index) => {
                    // delimitar la salida de datos para evitar columnas extra más allá de la cabecera
                    row.length = length;

                    if (row_index == 0) {
                        header = row;
                        if (replace_header_spaces || lowercase) {
                            for (let i = 0; i < header.length; i++) {
                                if (replace_header_spaces) {
                                    header[i] = header[i].toString().replace(/\s/g, '_');
                                }
                                if (lowercase) {
                                    header[i] = header[i].toString().toLowerCase();
                                }
                            }
                        }
                    }
                    else {
                        object = {};
                        // generar objeto
                        row.forEach((cell, cell_index) => {
                            // valores se deben retornar como '' para validación masiva
                            if (header[cell_index]) {
                                object[header[cell_index]] = cell ? cell : '';
                            }
                            else {
                                object['col_' + cell_index] = cell ? cell : '';
                            }
                        });
                        // adjuntar objeto a la matriz
                        array.push(object);
                    }
                })
            });

            return array;
        },
        /**
         * Verifica la información de las filas de la carga masiva acorde a la configuración de la misma
         * @param  Array rows      Filas de la carga masiva acorde a lo obtenido en masiveRead()
         * @param  Array structure Estructura de la carga masiva acorde a lo obtenido en masiveStructure()
         * @param  Array headers   Cabeceras de la carga masiva acorde a lo obtenido en masiveStructure()
         * @return Array           Errores
         */
        masiveValidate: async function(rows, structure, headers) {
            let errors = [];
            let with_errors = false;
            let row_errors, row, cell, value, header_position, validation;
            let cell_errors;

            [...rows].forEach((row) => {
                row_errors = [];
                for (cell in row) {
                    value = null;
                    header_position = -1;
                    validation = null;
                    cell_errors = [];

                    value = row[cell];
                    header_position = headers.header.indexOf(cell);
                    validation = header_position > -1 ? structure[header_position] : null;

                    if (validation) {
                        // validación de obligatorio
                        if (validation.required && !value) {
                            cell_errors.push('El campo ' + cell.toUpperCase() + ' es obligatorio.');
                        }
                        // validación de longitud
                        if (validation.length && validation.length.min > value.toString().length) {
                            cell_errors.push('El campo ' + cell.toUpperCase() + ' debe tener como mínimo ' + validation.length.min + ' caracteres.');
                        }
                        if (validation.length && validation.length.max > 0 && validation.length.max < value.toString().length) {
                            cell_errors.push('El campo ' + cell.toUpperCase() + ' debe tener como máximo ' + validation.length.max + ' caracteres.');
                        }
                        // validación de tipo de campo
                        if (value && validation.type) {
                            switch (validation.type) {
                                case 'alfanumérico':
                                    if (!this.validateAlphanumeric(value)) {
                                        cell_errors.push('El campo ' + cell.toUpperCase() + ' debe ser alfanumérico.');
                                    }
                                break;
                                case 'contrato':
                                    if (!this.validateContract(value)) {
                                        cell_errors.push('El campo ' + cell.toUpperCase() + ' debe ser un contrato válido.');
                                    }
                                break;
                                case 'correo electrónico':
                                    if (!this.validateEmail(value)) {
                                        cell_errors.push('El campo ' + cell.toUpperCase() + ' debe ser un correo electrónico válido.');
                                    }
                                break;
                                case 'fecha':
                                    if (!this.validateDate(value)) {
                                        cell_errors.push('El campo ' + cell.toUpperCase() + ' debe ser una fecha válida en formato YYYY-MM-DD.');
                                    }
                                break;
                                case 'letras':
                                    if (!this.validateAlphabetical(value)) {
                                        cell_errors.push('El campo ' + cell.toUpperCase() + ' debe ser alfabético.');
                                    }
                                break;
                                case 'numérico':
                                    if (!this.validateNumeric(value)) {
                                        cell_errors.push('El campo ' + cell.toUpperCase() + ' debe ser numérico.');
                                    }
                                break;
                                case 'numero de rol':
                                    if (!this.validateRolNumber(value)) {
                                        cell_errors.push('El campo ' + cell.toUpperCase() + ' debe ser un ROL válido.');
                                    }
                                break;
                                case 'placa':
                                    if (value.toString().indexOf('-') > -1 && !this.modulo11(value).valid) {
                                        cell_errors.push('El campo ' + cell.toUpperCase() + ' debe ser una PPU válida.');
                                    }
                                break;
                                case 'rut':
                                    if (!this.modulo11(value).valid) {
                                        cell_errors.push('El campo ' + cell.toUpperCase() + ' debe ser un RUT válido.');
                                    }
                                break;
                                case 'texto': break; // no se valida
                            }
                        }
                    }

                    if (cell_errors.length > 0) {
                        row_errors.push(cell_errors.join('<br />'));
                        with_errors = true;
                    }
                }

                errors.push(row_errors);
            })

            return {
                errors: errors,
                with_error: with_errors,
            };
        },
        /**
         * Función para ejecutar validación por Módulo 11 (para rut y placa patente)
         * @param  {String}  value        Rut o PPU a gestionar
         * @param  {Boolean} validate     Indica si se debe realizar validación del valor ingresado
         * @param  {Integer} type         Indica el id del tipo de vehículo a validar (acorde a utl_tipo_vehiculo)
         * @return {Object}               Retorna un objeto con {valid: true/false} y {digit: dv}
         */
        modulo11: function(value, validate = true, type = null) {
            if (!value) {
                return {
                    valid: false,
                    digit: null
                };
            }

            // se quitan los puntos del valor entregado en caso de que vengan en rut
            value = value.toString().replace(/\./g, '').toUpperCase();
            // se separa en texto y dígito
            let tmp = value.indexOf('-') > -1 ? value.split('-') : [];
            if (tmp.length != 2) {
                tmp[0] = validate ? value.substr(0, value.length - 1) : value;
                tmp[1] = validate ? value.substr(value.length - 1, value.length) : null;
            }
            let texto = tmp[0],
            dv = tmp[1],
            numero = 0,
            esPatenteAntigua = false;

            // no validar placa para carro de arrastre
            if (type === '51631' || type === 51631) {
                return {
                    valid: true,
                    digit: null
                };
            }
            // validar largo de caracteres
            else if (
                // sin dígito y debe ser validado
                (!dv && validate)
                // es vehículo
                || (isNaN(texto) && (
                    // sin tipo de vehículo, auto o moto
                    (!type && (texto.length > 6 || texto.length < 5))
                    // con tipo de vehículo, moto
                    || (type && type.toString().indexOf(['49', '21583']) > -1 && texto.length !== 5)
                    // con tipo de vehículo, no moto
                    || (type && type.toString().indexOf(['49', '21583']) == -1 && texto.length !== 6)
                ))
                // es rut
                || (!isNaN(texto) && (texto.length < 7 || texto.length > 8))
            ) {
                return {
                    valid: false,
                    digit: null
                };
            }

            // es rut
            if (!isNaN(texto)) {
                numero = parseInt(texto);
            }
            // es vehículo
            else {
                // validación motos ABC12
                let placa = texto,
                c1 = placa.substr(0, 1), // A
                c2 = placa.substr(1, 1), // B
                c3 = placa.substr(2, 1), // C
                c4 = placa.substr(3, 1); // 0
                // es moto - se agrega un 0 para validación
                if(isNaN(c1) && isNaN(c2) && isNaN(c3) && !isNaN(c4)) {
                    placa = c1 + c2 + c3 + '0' + c4 + placa.substr(4);
                }

                if (placa.length !== 6) {
                    return {
                        valid: false,
                        digit: null
                    };
                }

                // AB1234
                esPatenteAntigua = (!isNaN(placa.substr(2))) ? true : false;

                let aux = 0;
                if(esPatenteAntigua) {
                    let valor = ppuOldValue(placa.substr(0, 2));
                    if(valor == '') {
                        return {
                            valid: false,
                            digit: null,
                        };
                    }

                    valor += parseInt(placa.substr(2, texto.length - 1));
                    numero = parseInt(valor);
                }
                else {
                    let valor = '';
                    for(let i = 0; i < placa.length; i++) {
                        if(isNaN(placa[i])) {
                            valor += ppuNewValue(placa[i]);
                        }
                        else {
                            valor += placa[i];
                        }
                    }

                    numero = parseInt(valor);
                }
            }

            // validar
		    let total = 0,
            por = 2,
            x = 0;
		    for(let i = numero.toString().length - 1; i >= 0; i--) {
		        if(por > 7) { por = 2; }
		        total += parseInt(numero.toString().substr(i, 1)) * por;
		        por++;
		    }

		    let resto = total % 11,
            ref = 11 - resto,
            dv_r = '';

		    if(!isNaN(texto)) {
		        if(resto === 1) { dv_r = 'K'; }
		        else if(resto === 0) { dv_r = 0; }
		        else { dv_r = ref; }
		    }
		    else {
		        if(esPatenteAntigua) {
		            if(ref == 11) { dv_r = '0'; }
		            else if(ref == 10) { dv_r = 'K'; }
		            else { dv_r = ref; }
		        }
		        else {
		            if(resto == 0) { dv_r = '0'; }
		            else if(ref == 10) { dv_r = 'K'; }
		            else { dv_r = ref; }
		        }
		    }

            return {
                valid: dv_r == dv,
                digit: dv_r
            };
        },
        /**
         * Validación de campo alfabético
         * @param  {String} value
         * @return {Boolean}      True=Válido | False=Inválido
         */
        validateAlphabetical: function(value) {
            let regex = /^([a-zA-Z])*$/;
            return regex.test(value);
        },
        /**
         * Validación de campo alfanumérico
         * @param  {String} value
         * @return {Boolean}      True=Válido | False=Inválido
         */
        validateAlphanumeric: function(value) {
            let regex = /^([a-zA-Z0-9])*$/;
            return regex.test(value);
        },
        /**
         * Validación de campo contrato
         * @param  {String} value
         * @return {Boolean}      True=Válido | False=Inválido
         */
        validateContract: function(value) {
            let regex = /^([a-zA-Z0-9-])*$/;
            return regex.test(value);
        },
        /**
         * Validación de campo fecha
         * @param  {String} value
         * @return {Boolean}      True=Válido | False=Inválido
         */
        validateDate: function(value) {
            let date = moment(value, "YYYY-MM-DD", true);
            return date.isValid();
        },
        /**
         * Validación de correo electrónico
         * @param  {String} value Correo
         * @return {Boolean}      True=Válido | False=Inválido
         */
        validateEmail: function(string) {
            let regex = /^([a-zA-Z0-9_.+-])+\@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,4})+$/;
            return regex.test(string);
        },
        /**
         * Validación de campo numérico
         * @param  {String} value
         * @return {Boolean}      True=Válido | False=Inválido
         */
        validateNumeric: function(string) {
            let regex = /^([0-9])*$/;
            return regex.test(string);
        },
        /**
         * Validación de campo número de rol
         * @param  {String} value
         * @return {Boolean}      True=Válido | False=Inválido
         */
        validateRolNumber: function(string) {
            let regex = /^([0-9]){1,}-([0-9]){1,}$/;
            return regex.test(string);
        },
        /**
         * Valida la extensión del archivo acorde al parámetro o parámetros ingresados
         * @param  {String} filename Nombre del archivo
         * @param  {String} param    Extensión permitida para el archivo (separada por coma)
         * @return {Boolean}         TRUE=válido FALSE=inválido
         */
        validateExtension: function(filename, param) {
            param = typeof param === "string" ? param.replace(/\s+/g, '').replace(/,/g, '|') : 'jpe?g|png|gif|bmp';
            let extension = '.'+filename.replace(/^.*\./, '').toLowerCase(),
            regex = new RegExp("\\.(" + param + ")$", "i");
            return regex.test(extension);
        },
    },
});
