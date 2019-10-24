<?php

/**
 * Nextcloud - cospend
 *
 * This file is licensed under the Affero General Public License version 3 or
 * later. See the COPYING file.
 *
 * @author Julien Veyssier <eneiluj@posteo.net
 * @copyright Julien Veyssier 2019
 */

namespace OCA\Cospend\Db;

use OCP\AppFramework\Db\Entity;

class Project extends Entity {

    protected $id;
    protected $what;
    protected $payerId;
    protected $date;
    protected $repeat;

    public function __construct() {
        $this->addType('id', 'string');
        $this->addType('userid', 'string');
        $this->addType('name', 'string');
        $this->addType('email', 'string');
        $this->addType('password', 'string');
    }
}
