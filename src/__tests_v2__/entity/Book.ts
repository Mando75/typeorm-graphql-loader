import {
  CreateDateColumn,
  Column,
  ManyToOne,
  BaseEntity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  OneToMany
} from "typeorm";
import { Author } from "./Author";
import { Publisher } from "./Publisher";
import { Review } from "./Review";

export class Book extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column("varchar")
  title!: string;

  @Column("varchar")
  summary!: string;

  @Column("date")
  publishedDate!: Date;

  @ManyToOne(
    type => Author,
    author => author.books
  )
  author!: Author;

  @ManyToOne(
    type => Publisher,
    publisher => publisher.books
  )
  publisher!: Publisher;

  @OneToMany(
    t => Review,
    review => review.book
  )
  reviews!: Review[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
