
module.exports = function (grunt) {
    'use strict';

    var version = '2.16.5';
    var mixIn = require('mout/object/mixIn');
    var requireConfig = {
        baseUrl: 'app/',
        paths: {
            'text': '../Scripts/text',
            'durandal': '../Scripts/durandal',
            'plugins': '../Scripts/durandal/plugins',
            'transitions': '../Scripts/durandal/transitions',
            'knockout': '../Scripts/knockout-3.0.0',
            'jwerty': '../Scripts/jwerty-0.3',
            'moment': '../Scripts/moment',
            'modules': './modules',
            'common': './common',
            'crmDynamics': './crmDynamics',
            'mapsjs': '../Scripts/isc.rim',
            'lang': '../Scripts/i18next.amd.withJQuery-1.6.3.min',
            'async': '../Scripts/async',
            'spin': '../Scripts/spin',
            'jquery': 'empty:' // we have it in the global scope
        }
    };

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        'clean': {
            pre: ['build/*'],
            post: ['build/app/common/**', 'build/app/modules/**', 'build/app/viewmodels/**', 'build/app/crm/**', 'build/app/views/**', 'build/REST/files/Project/**', 'build/REST/files/Csv/**', 'build/app/main.js']
        },

        'copy': {
            index: {
                src: 'index.html',
                dest: 'build/'
            },
            globalasax: {
                src: 'global.asax',
                dest: 'build/'
            },
            favicon: {
                src: 'favicon.ico',
                dest: 'build/'
            },
            bin: {
                src: 'bin/*.dll',
                dest: 'build/'
            },
            app: {
                src: 'app/**/**',
                dest: 'build/'
            },
            content: {
                src: 'content/**/**',
                dest: 'build/'
            },
            locales: {
                src: 'locales/**/*.json',
                dest: 'build/'
            },
            scripts: {
                src: 'Scripts/**/**',
                dest: 'build/'
            },
            rest: {
                src: 'REST/**/*.ashx',
                dest: 'build/'
            },
            oistorage: {
                src: '../IOSupport/SQLServer/bin/debug/OpenIntel.IOSupport.SqlServer.dll',
                dest: 'build/bin/OpenIntel.IOSupport.SqlServer.dll'
            }
        },

        'durandal': {
            main: {
                src: ['app/**/*.*', 'scripts/durandal/**/*.js'],
                options: {
                    name: '../scripts/almond',
                    baseUrl: requireConfig.baseUrl,
                    mainPath: 'app/main',
                    paths: mixIn({}, requireConfig.paths, { 'almond': '../scripts/almond.js' }),
                    exclude: [],
                    optimize: 'none',
                    out: 'build/app/main.js'
                }
            }
        },

        'replace': {
            updateMain: {
                src: ['build/app/main.js'],
                overwrite: true,
                replacements: [
                    {
                        from: '@@APPVERSION@#',
                        to: version
                    }
                ]
            },
            updateIndex: {
                src: ['build/index.html'],
                overwrite: true,
                replacements: [
                    {
                        from: './App/main',
                        to: './App/main' + version
                    }
                ]
            }
        },

        'uglify': {
            options: {
                banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> \n' +
                    '* Copyright <%= grunt.template.today("yyyy") %> Imager Software, Inc. \n' +
                    '*/\n'
            },
            build: {
                src: 'build/app/main.js',
                dest: 'build/app/main' + version + '.js'
            }
        },

        'ftp-deploy': {
            original: {
                auth: {
                    host: 'ftp.easyterritory.com',
                    port: 21,
                    username: "deploy",
                    password: "IaMADMIN!"
                },
                src: 'build/',
                dest: '/dev/APP'
            },
            new1: {
                auth: {
                    host: '40.121.84.217',
                    port: 21,
                    username: "deploy",
                    password: "h3Reyeseeum"
                },
                src: 'build/',
                dest: '/dev/APP'
            },
            new2: {
                auth: {
                    host: '40.76.93.26',
                    port: 21,
                    username: "deploy",
                    password: "h3Reyeseeum"
                },
                src: 'build/',
                dest: '/dev/APP'
            }
        }
    });

    // Loading plugin(s)
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-durandal');
    grunt.loadNpmTasks('grunt-ftp-deploy');
    grunt.loadNpmTasks('grunt-text-replace');

    grunt.registerTask('wipe', ['clean:pre']);
    grunt.registerTask('ftp', ['ftp-deploy']);
    grunt.registerTask('copyFiles', ['clean:pre', 'copy']);

    grunt.registerTask('version', ['replace:updateMain', 'replace:updateIndex']);
    grunt.registerTask('default', ['clean:pre', 'copy', 'durandal:main', 'replace:updateMain', 'replace:updateIndex', 'uglify', 'clean:post', 'ftp-deploy:original']);
    grunt.registerTask('buildOnly', ['clean:pre', 'copy', 'durandal:main', 'replace:updateMain', 'replace:updateIndex', 'uglify', 'clean:post']);
    grunt.registerTask('buildNew', ['clean:pre', 'copy', 'durandal:main', 'replace:updateMain', 'replace:updateIndex', 'uglify', 'clean:post', 'ftp-deploy:new1', 'ftp-deploy:new2']);
    grunt.registerTask('ftpNew', ['ftp-deploy:new1', 'ftp-deploy:new2']);
    grunt.registerTask('ftpNew1', ['ftp-deploy:new1']);
    grunt.registerTask('ftpNew2', ['ftp-deploy:new2']);
};
