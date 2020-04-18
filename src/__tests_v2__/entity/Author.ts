import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from "typeorm";
import { Book } from "./Book";

@Entity()
export class Author extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column("varchar")
  email!: string;

  @Column("varchar")
  firstName!: string;

  @Column("varchar")
  lastName!: string;

  @OneToMany(
    type => Book,
    book => book.author
  )
  books!: Book[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
